const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

router.post('/create-intent', protect, async (req, res) => {
  try {
    const { amount } = req.body; 

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey.startsWith('sk_test_51RBdummy')) {

      return res.json({
        clientSecret: 'pi_demo_secret_' + Date.now(),
        demo: true,
        message: 'Demo mode: Add your Stripe key to .env to enable real payments'
      });
    }

    const stripe = require('stripe')(stripeKey);

    const amountInCents = Math.round(amount * 0.0036 * 100); 
    const minAmount = 50; 
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.max(amountInCents, minAmount),
      currency: 'usd',
      automatic_payment_methods: { enabled: true }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;