const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  category: { type: String },
  description: { type: String },
  stock: { type: Number, default: 100 },

  views: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },
  rating: { type: Number, default: 4.0 },
  reviewCount: { type: Number, default: 0 },

  metaTitle: { type: String },
  metaDescription: { type: String },
  metaKeywords: { type: String },
  slug: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);