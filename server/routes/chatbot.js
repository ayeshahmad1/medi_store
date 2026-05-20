const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const Product = require('../models/Product');
const Order = require('../models/Order');

// ─── Gemini Setup (lazy init so .env is fully loaded first) ──────────────────
let _ai = null;
function getAI() {
  if (!_ai) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set in server/.env');
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _ai;
}

// Extract retry-after delay from a 429 error message
function parseRetryDelay(errMsg) {
  const m = errMsg.match(/retryDelay["\s:]+(\d+)/i) || errMsg.match(/retry in ([\d.]+)s/i);
  return m ? Math.ceil(parseFloat(m[1])) * 1000 : 5000; // default 5s
}

async function callGemini(prompt, jsonMode = true, attempt = 0) {
  try {
    const config = jsonMode
      ? { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 1024 }
      : { temperature: 0.7, maxOutputTokens: 1024 };

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config,
    });

    const text = response.text;
    console.log('✅ Gemini (gemini-1.5-pro) responded successfully');
    return text?.trim() || null;
  } catch (err) {
    const msg = err.message || '';
    // Auto-retry on 429 rate-limit — wait the suggested delay then retry
    if (msg.includes('429') && attempt < 2) {
      const delay = parseRetryDelay(msg);
      console.warn(`⏳ Gemini rate limited — retrying in ${delay}ms (attempt ${attempt + 1}/2)...`);
      await new Promise(r => setTimeout(r, delay));
      return callGemini(prompt, jsonMode, attempt + 1);
    }
    console.error('⚠️  Gemini API error:', msg.split('\n')[0]);
    return null;
  }
}


// ─── Store Context ────────────────────────────────────────────────────────────
const STORE_CONTEXT = `You are MediBot — an AI-powered pharmacy assistant for MediStore Pakistan, an online medicine e-commerce platform.

STORE INFO:
- Products: OTC medicines, prescription drugs, vitamins, supplements
- Delivery: FREE nationwide | Same-day in Lahore | 2-3 days elsewhere  
- Payment: Visa/Mastercard, Cash on Delivery, Bank Transfer, Stripe
- Return Policy: 7 days for unopened sealed items
- Working Hours: Mon-Sat 9AM-9PM | Sunday 11AM-7PM
- Support: support@medistore.pk | +92 300 1234567

ACTIVE DISCOUNT CODES:
- WELCOME10: 10% off first order (min PKR 500)
- MEDI20: 20% off orders above PKR 1,000  
- HEALTH15: 15% off vitamins (min PKR 300)
- SAVE30: PKR 30 flat off any order (min PKR 200)

RULES:
1. ONLY use product/price data I provide — never invent medicine names or prices
2. Never give medical diagnosis — say "consult your doctor/pharmacist"
3. Always use PKR for prices
4. Be warm and helpful like a pharmacist friend
5. Keep responses concise (2-4 sentences max)
6. If you don't know, say so honestly`;

// ─── Intent Detection ─────────────────────────────────────────────────────────
const detectIntent = (text) => {
  const t = text.toLowerCase();
  if (/(where|track|status|order number|my order|shipped|delivered|dispatch)/.test(t)) return 'ORDER';
  if (/(recommend|popular|trending|best seller|top medicine|suggest|what should i buy|good medicine|medicine for|medicines for|treatment for|remedy for|cure for|help with|suffer|suffering)/.test(t)) return 'RECOMMEND';
  if (/(under|below|less than|cheap|budget|pkr|rs\s*\d|\d\s*rs|affordable)/.test(t)) return 'PRICE';
  if (/(antibiotic|painkill|vitamin|antacid|cardiac|diabet|allerg|supplement)/.test(t)) return 'CATEGORY';
  if (/(coupon|discount|promo|offer|deal|code|voucher|sale)/.test(t)) return 'COUPON';
  if (/(ship|deliver|how long|return|refund|policy|payment|pay|cod|cash|card)/.test(t)) return 'FAQ';
  if (/(my cart|view cart|show cart)/.test(t)) return 'VIEW_CART';
  if (/(remove.*cart|cart.*remove|delete.*cart)/.test(t)) return 'REMOVE_CART';
  if (/(add.*cart|cart.*add|buy now)/.test(t)) return 'ADD_CART';
  return 'SEARCH';
};

const extractMaxPrice = (text) => {
  const m = text.match(/(?:under|below|less than|upto?|max|within|cheaper than)\s*(?:pkr|rs|rupees?)?\s*([\d,]+)/i)
    || text.match(/([\d,]+)\s*(?:pkr|rs\b|rupees?)/i);
  return m ? parseFloat(m[1].replace(/,/g, '')) : null;
};

const extractCategory = (text) => {
  const map = [
    [/antibiotic/i, 'Antibiotic'], [/painkill|brufen|ibuprofen|aspirin/i, 'Painkiller'],
    [/vitamin|supplement/i, 'Vitamin'], [/antacid|stomach|acid|digest/i, 'Antacid'],
    [/cardiac|heart|bp|blood pressure/i, 'Cardiac'], [/diabet|insulin|glucose/i, 'Diabetes'],
    [/allerg|antihistamin|cetiriz/i, 'Allergy'],
  ];
  for (const [re, label] of map) { if (re.test(text)) return label; }
  return null;
};

const extractKeywords = (text) => {
  const stops = /\b(find|search|show|get|need|want|can i|do you|have|in stock|available|looking for|buy|a\b|an\b|the\b|any|some|me|please|is|are|much|how|what|which)\b/gi;
  return text.replace(stops, ' ').replace(/\s{2,}/g, ' ').trim();
};

// ─── DB Context Fetcher ───────────────────────────────────────────────────────
async function fetchDBContext(message, intent, userId) {
  const ctx = { products: [], orders: [], hasUser: !!userId, noResultsFor: null };
  const PAD_TARGET = 6; // always try to show at least 6 products
  try {
    if (intent === 'ORDER') {
      if (userId) ctx.orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean();
      return ctx;
    }
    if (intent === 'RECOMMEND') {
      if (userId) {
        const pastOrders = await Order.find({ user: userId }).select('items.product').lean();
        const boughtIds = [...new Set(pastOrders.flatMap(o => o.items.map(i => i.product?.toString())))].filter(Boolean);
        if (boughtIds.length > 0) {
          ctx.products = await Product.find({ _id: { $in: boughtIds }, stock: { $gt: 0 } }).limit(3).lean();
        }
      }
      const currentIds = ctx.products.map(p => p._id.toString());
      const trending = await Product.find({ _id: { $nin: currentIds }, stock: { $gt: 0 } })
        .sort({ purchases: -1, rating: -1 }).limit(PAD_TARGET - ctx.products.length).lean();
      ctx.products = [...ctx.products, ...trending];
      return ctx;
    }
    if (intent === 'PRICE') {
      const max = extractMaxPrice(message);
      ctx.products = await Product.find(max ? { price: { $lte: max }, stock: { $gt: 0 } } : { stock: { $gt: 0 } })
        .sort({ price: 1 }).limit(PAD_TARGET).lean();
      return ctx;
    }
    if (intent === 'CATEGORY') {
      const cat = extractCategory(message);
      if (cat) {
        ctx.products = await Product.find({ category: { $regex: cat, $options: 'i' }, stock: { $gt: 0 } })
          .sort({ purchases: -1 }).limit(PAD_TARGET).lean();
      }
      // pad with popular if not enough results
      if (ctx.products.length < PAD_TARGET) {
        const existIds = ctx.products.map(p => p._id.toString());
        const extra = await Product.find({ _id: { $nin: existIds }, stock: { $gt: 0 } })
          .sort({ purchases: -1 }).limit(PAD_TARGET - ctx.products.length).lean();
        ctx.products = [...ctx.products, ...extra];
      }
      return ctx;
    }

    // SEARCH — try keyword match first, then pad with popular
    const kw = extractKeywords(message);
    const isTopRated = /(top rated|best|high rating|good rating|4 star|5 star)/i.test(message);
    const sortMap = isTopRated ? { rating: -1 } : { purchases: -1 };

    if (kw.length > 1) {
      ctx.products = await Product.find({
        stock: { $gt: 0 },
        $or: [
          { name: { $regex: kw, $options: 'i' } },
          { category: { $regex: kw, $options: 'i' } },
          { description: { $regex: kw, $options: 'i' } },
        ],
      }).sort(sortMap).limit(PAD_TARGET).lean();

      if (!ctx.products.length) ctx.noResultsFor = kw;
    }

    // Always pad to PAD_TARGET with popular products
    if (ctx.products.length < PAD_TARGET) {
      const existIds = ctx.products.map(p => p._id.toString());
      const popular = await Product.find({ _id: { $nin: existIds }, stock: { $gt: 0 } })
        .sort(sortMap).limit(PAD_TARGET - ctx.products.length).lean();
      ctx.products = [...ctx.products, ...popular];
    }
  } catch (err) {
    console.error('DB context error:', err.message);
  }
  return ctx;
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────
function buildPrompt({ message, dbCtx, history, intent, cart }) {
  const productLines = dbCtx.products.length > 0
    ? dbCtx.products.map((p, i) =>
      `${i + 1}. ${p.name} | ID: ${p._id} | PKR ${p.price} | ${p.category || 'General'} | ${p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'} | Rating: ${p.rating || 4}/5`
    ).join('\n')
    : 'No product data for this query.';

  const orderLines = dbCtx.orders.length > 0
    ? dbCtx.orders.map((o, i) =>
      `${i + 1}. #${o._id.toString().slice(-8).toUpperCase()} | Status: ${o.status} | PKR ${o.totalAmount} | ${o.items?.length || 0} items | ${new Date(o.createdAt).toLocaleDateString()}`
    ).join('\n')
    : (dbCtx.hasUser ? 'No orders found for this user.' : 'User not logged in.');

  const cartLines = cart && cart.length > 0
    ? cart.map(c => `- ${c.name} (Qty: ${c.quantity}) | ID: ${c.id}`).join('\n')
    : 'Cart is empty.';

  const historyLines = history.length > 0
    ? history.slice(-6).map(m => `${m.from === 'user' ? 'Customer' : 'MediBot'}: ${m.message}`).join('\n') + '\n'
    : '';

  const noResultNote = dbCtx.noResultsFor
    ? `\nNote: "${dbCtx.noResultsFor}" had no matches; showing popular alternatives instead.\n` : '';

  return `${STORE_CONTEXT}

${historyLines}PRODUCTS FROM DATABASE:
${productLines}
${noResultNote}
ORDERS FROM DATABASE:
${orderLines}

CURRENT USER CART:
${cartLines}

QUERY TYPE: ${intent}
Customer: "${message}"

INSTRUCTIONS:
- Respond as a helpful pharmacy assistant.
- If intent is RECOMMEND or SEARCH, set showProducts to true so the customer can see available medicines.
- Use only the product data provided above — never invent medicine names or prices.
- For add-to-cart requests: set action to {"type":"ADD_TO_CART","product":{"_id":"...","name":"...","price":...}}
- For remove-from-cart requests: set action to {"type":"REMOVE_FROM_CART","productId":"..."}
- quickReplies should be 3 short follow-up suggestions relevant to the query.

You MUST respond with ONLY this JSON object:
{"message":"your helpful reply","showProducts":true,"showOrders":false,"showCoupons":false,"quickReplies":["suggestion1","suggestion2","suggestion3"],"action":null}`;
}

// ─── Response Parser ──────────────────────────────────────────────────────────
function parseResponse(raw) {
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch { }

  return {
    message: raw.substring(0, 500).trim(),
    showProducts: false, showOrders: false, showCoupons: false,
    quickReplies: ['🔍 Search Medicine', '📦 Track Order', '💊 Recommendations', '❓ Help'],
  };
}

// ─── Quick Replies & Coupons ──────────────────────────────────────────────────
const QR = {
  ORDER: ['💊 Shop More', '🔍 Search Medicines', '❓ Return Policy'],
  RECOMMEND: ['🛒 Add to Cart', '🔍 Search Specific', '📦 Track Order'],
  SEARCH: ['🛒 View Cart', '💊 More Suggestions', '🎁 Discount Codes'],
  ADD_CART: ['🛒 View Cart', '➡️ Checkout', '🔍 Search More'],
  FAQ: ['📦 Track Order', '🔍 Search Medicine', '💊 Recommendations'],
  COUPON: ['🛒 View Cart', '➡️ Checkout', '🔍 Browse Medicines'],
  default: ['🔍 Search Medicine', '📦 Track Order', '💊 Recommendations', '❓ Help'],
};

const COUPONS = [
  { code: 'WELCOME10', discount: '10% OFF', desc: 'First-time order discount', minOrder: 500, color: '#10b981' },
  { code: 'MEDI20', discount: '20% OFF', desc: 'Orders above PKR 1,000', minOrder: 1000, color: '#3b82f6' },
  { code: 'HEALTH15', discount: '15% OFF', desc: 'Vitamins & supplements', minOrder: 300, color: '#f59e0b' },
  { code: 'SAVE30', discount: 'PKR 30 OFF', desc: 'Any order flat discount', minOrder: 200, color: '#8b5cf6' },
];

// ─── Smart Fallback ───────────────────────────────────────────────────────────
function buildFallback(message, intent, dbCtx) {
  const qr = QR[intent] || QR.default;
  switch (intent) {
    case 'ORDER':
      return { message: dbCtx.orders.length > 0 ? '📦 Here are your recent orders:' : "📭 No orders found. Make sure you're logged in!", showProducts: false, showOrders: dbCtx.orders.length > 0, showCoupons: false, quickReplies: qr };
    case 'RECOMMEND':
    case 'SEARCH':
    case 'ADD_CART':
      return { message: dbCtx.products.length > 0 ? `🔍 ${dbCtx.noResultsFor ? `No exact match for "${dbCtx.noResultsFor}" — showing popular alternatives:` : 'Here are the medicines I found:'}` : "😔 No medicines found. Try a different search!", showProducts: dbCtx.products.length > 0, showOrders: false, showCoupons: false, quickReplies: qr };
    case 'PRICE':
      return { message: dbCtx.products.length > 0 ? '💰 Medicines within your budget:' : '😔 None found in that price range. Try a higher budget!', showProducts: dbCtx.products.length > 0, showOrders: false, showCoupons: false, quickReplies: ['Under PKR 500', 'Under PKR 1000', '🔍 Browse All'] };
    case 'CATEGORY':
      return { message: dbCtx.products.length > 0 ? '💊 Medicines in that category:' : '😔 None in stock in that category right now.', showProducts: dbCtx.products.length > 0, showOrders: false, showCoupons: false, quickReplies: qr };
    case 'COUPON':
      return { message: '🎁 Here are your exclusive MediStore discount codes:', showProducts: false, showOrders: false, showCoupons: true, quickReplies: ['🛒 View Cart', '➡️ Checkout', '🔍 Browse Medicines'] };
    case 'REMOVE_CART':
      return { message: "✅ I've updated your cart! Need anything else?", showProducts: false, showOrders: false, showCoupons: false, quickReplies: qr };
    case 'FAQ':
      return { message: '🚀 **Shipping:** FREE, same-day Lahore / 2-3 days nationwide\n↩️ **Returns:** 7 days, unopened items\n💳 **Payment:** Cards, COD, Bank Transfer, Stripe\n📞 **Help:** +92 300 1234567', showProducts: false, showOrders: false, showCoupons: false, quickReplies: qr };
    default:
      return { message: "👋 Hi! I'm MediBot. Search medicines, track orders, or ask me anything about MediStore!", showProducts: false, showOrders: false, showCoupons: false, quickReplies: QR.default };
  }
}

const fmtProducts = (products) =>
  products.map(p => ({ _id: p._id, name: p.name, price: p.price, image: p.image, category: p.category, stock: p.stock, rating: p.rating, purchases: p.purchases }));

const fmtOrders = (orders) =>
  orders.map(o => ({ id: o._id, shortId: o._id.toString().slice(-8).toUpperCase(), status: o.status, totalAmount: o.totalAmount, itemCount: o.items?.length || 0, isPaid: o.isPaid, createdAt: o.createdAt, items: (o.items || []).slice(0, 3).map(i => ({ name: i.name, quantity: i.quantity, price: i.price })) }));

// ─── Main Chat Route ──────────────────────────────────────────────────────────
router.post('/message', async (req, res) => {
  try {
    const { message, userId, conversationHistory = [], cart = [] } = req.body;

    if (!message?.trim()) {
      return res.json({ type: 'text', message: 'Please type something! 😊', quickReplies: QR.default, showProducts: false, showOrders: false, showCoupons: false, products: [], orders: [], coupons: [] });
    }

    const intent = detectIntent(message);
    const dbCtx = await fetchDBContext(message, intent, userId);
    const prompt = buildPrompt({ message, dbCtx, history: conversationHistory, intent, cart });

    const rawResponse = await callGemini(prompt);

    let parsed = rawResponse ? parseResponse(rawResponse) : null;
    if (!parsed) {
      console.log('🔄 Using smart fallback (Gemini unavailable)');
      parsed = buildFallback(message, intent, dbCtx);
    }

    const showProducts = !!(parsed.showProducts && dbCtx.products.length > 0);
    const showOrders = !!(parsed.showOrders && dbCtx.orders.length > 0);
    const showCoupons = !!(parsed.showCoupons || intent === 'COUPON');

    if (!parsed.quickReplies?.length) parsed.quickReplies = QR[intent] || QR.default;

    return res.json({
      type: rawResponse ? 'gemini' : 'fallback',
      message: parsed.message || "🤔 I didn't quite understand that. Please try again!",
      showProducts,
      showOrders,
      showCoupons,
      products: showProducts ? fmtProducts(dbCtx.products) : [],
      orders: showOrders ? fmtOrders(dbCtx.orders) : [],
      coupons: showCoupons ? COUPONS : [],
      quickReplies: parsed.quickReplies,
      action: parsed.action || null,
    });

  } catch (err) {
    console.error('Chatbot error:', err.message);
    res.status(500).json({ type: 'error', message: '⚠️ Something went wrong. Please try again!', quickReplies: QR.default, showProducts: false, showOrders: false, showCoupons: false, products: [], orders: [], coupons: [] });
  }
});

// ─── Product Suggestions ──────────────────────────────────────────────────────
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const products = await Product.find({ name: { $regex: q, $options: 'i' } }).select('name category price').limit(6);
    res.json(products);
  } catch { res.json([]); }
});

router.get('/trending', async (req, res) => {
  try {
    const products = await Product.find({ stock: { $gt: 0 } }).sort({ purchases: -1, views: -1, rating: -1 }).limit(4);
    res.json(products);
  } catch { res.json([]); }
});

router.get('/also-bought/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.json([]);
    const related = await Product.find({ _id: { $ne: product._id }, category: product.category, stock: { $gt: 0 } }).sort({ purchases: -1 }).limit(4);
    res.json(related);
  } catch { res.json([]); }
});

router.post('/track-view/:productId', async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.productId, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch { res.json({ success: false }); }
});

// ─────────────────────────────────────────────
//  ADMIN SEO AI ASSISTANT
// ─────────────────────────────────────────────

const SEO_BOT_CONTEXT = `You are SeoBot — an expert SEO specialist for MediStore Pakistan, an online pharmacy e-commerce platform.
Your job is to generate highly optimised SEO meta-tags for medicine product pages so that they rank highly on Google.

RULES:
1. Always respond in valid JSON only — no markdown, no extra text.
2. metaTitle: ≤ 60 characters. Include the medicine name and "Pakistan" or "MediStore" for local relevance.
3. metaDescription: 140-160 characters. Compelling, includes a call-to-action and the product name.
4. metaKeywords: 8-12 comma-separated keywords. Mix brand/generic names, conditions treated, and shopping intent terms (e.g. "buy online pakistan").
5. suggestedSlug: URL-friendly slug using hyphens, lowercase, no special chars.
6. seoScore: integer 1-100 estimating how optimised the tags are.
7. tips: array of 2-3 short actionable tips to further improve the SEO.

Respond ONLY with this JSON (no markdown):
{"metaTitle":"...","metaDescription":"...","metaKeywords":"...","suggestedSlug":"...","seoScore":85,"tips":["tip1","tip2"]}`;

router.post('/seo-generate', async (req, res) => {
  try {
    const { productName, category, description, userMessage } = req.body;

    if (!productName?.trim()) {
      return res.status(400).json({ error: 'productName is required' });
    }

    const hasCustomMessage = userMessage && userMessage.trim().length > 0;

    const prompt = `${SEO_BOT_CONTEXT}

PRODUCT DETAILS:
- Name: ${productName}
- Category: ${category || 'General Medicine'}
- Description: ${description || 'No description provided'}
${hasCustomMessage ? `\nADMIN INSTRUCTION: "${userMessage.trim()}"` : ''}

Generate the best possible SEO meta-tags for this medicine product page targeting Pakistani customers.
Remember: respond with valid JSON only.`;

    const rawResponse = await callGemini(prompt);

    if (!rawResponse) {
      const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const cat = category || 'Medicine';
      return res.json({
        source: 'fallback',
        metaTitle: `Buy ${productName} Online | MediStore Pakistan`,
        metaDescription: `Order ${productName} at the best price in Pakistan. Fast delivery, genuine medicines, cash on delivery available. Shop ${cat} online at MediStore.`,
        metaKeywords: `${productName.toLowerCase()}, buy ${productName.toLowerCase()} pakistan, ${slug}, online pharmacy pakistan, ${cat.toLowerCase()} pakistan, medicine online, medistore pakistan`,
        suggestedSlug: slug,
        seoScore: 65,
        tips: [
          'Add a detailed product description for richer SEO context.',
          'Include generic drug name in the keywords for broader reach.',
          'Ensure product images have descriptive alt text.',
        ],
      });
    }

    try {
      const cleaned = rawResponse.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return res.json({ source: 'gemini', ...parsed });
      }
    } catch { /* fall through */ }

    return res.json({ source: 'gemini_raw', raw: rawResponse });

  } catch (err) {
    console.error('SEO generate error:', err.message);
    res.status(500).json({ error: 'SEO generation failed', details: err.message });
  }
});

// SEO chatbot multi-turn conversation endpoint
router.post('/seo-chat', async (req, res) => {
  try {
    const { productName, category, description, history = [], message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const historyLines = history.slice(-6).map(m =>
      `${m.role === 'user' ? 'Admin' : 'SeoBot'}: ${m.content}`
    ).join('\n');

    const prompt = `${SEO_BOT_CONTEXT}

PRODUCT CONTEXT:
- Name: ${productName || 'Unknown'}
- Category: ${category || 'General Medicine'}
- Description: ${description || 'No description provided'}

${historyLines ? `CONVERSATION HISTORY:\n${historyLines}\n` : ''}Admin: "${message.trim()}"

If the admin is asking a general SEO question, answer helpfully (but still return JSON with a "reply" field instead).
If the admin wants to generate or improve tags, return the full SEO JSON format.
Choose based on context. Always return valid JSON.`;

    const rawResponse = await callGemini(prompt);

    if (!rawResponse) {
      return res.json({
        source: 'fallback',
        reply: `I can help you optimize SEO for "${productName || 'this product'}". Try asking me to generate meta tags, suggest keywords, or improve your description. For best results, make sure the product name and category are filled in first.`,
      });
    }

    try {
      const cleaned = rawResponse.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return res.json({ source: 'gemini', ...parsed });
      }
    } catch { /* fall through */ }

    return res.json({ source: 'gemini', reply: rawResponse.substring(0, 800).trim() });

  } catch (err) {
    console.error('SEO chat error:', err.message);
    res.status(500).json({ error: 'SEO chat failed', details: err.message });
  }
});

module.exports = router;