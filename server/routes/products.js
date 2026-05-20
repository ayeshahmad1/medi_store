const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  }
});

router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (category && category !== 'All') query.category = { $regex: category, $options: 'i' };
    const products = await Product.find(query);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) res.json(product);
    else res.status(404).json({ message: 'Product not found' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const { name, price, category, description, stock, metaTitle, metaDescription, metaKeywords } = req.body;

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const image = req.file ? `${baseUrl}/uploads/${req.file.filename}` : 'https://placehold.co/400x400?text=No+Image';

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const product = new Product({ name, price, image, category, description, stock, metaTitle, metaDescription, metaKeywords, slug });
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const { name, price, category, description, stock, metaTitle, metaDescription, metaKeywords } = req.body;
    const product = await Product.findById(req.params.id);
    if (product) {
      product.name = name !== undefined ? name : product.name;
      product.price = price !== undefined ? price : product.price;

      if (req.file) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        product.image = `${baseUrl}/uploads/${req.file.filename}`;
      }

      product.category = category !== undefined ? category : product.category;
      product.description = description !== undefined ? description : product.description;
      product.stock = stock !== undefined ? stock : product.stock;
      product.metaTitle = metaTitle !== undefined ? metaTitle : product.metaTitle;
      product.metaDescription = metaDescription !== undefined ? metaDescription : product.metaDescription;
      product.metaKeywords = metaKeywords !== undefined ? metaKeywords : product.metaKeywords;
      if (name) product.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await product.deleteOne();
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;