const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist', '_id name image price category description stock');
    res.json(user.wishlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:productId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.productId;
    const index = user.wishlist.findIndex(id => id.toString() === productId);
    if (index > -1) {

      user.wishlist.splice(index, 1);
      await user.save();
      res.json({ message: 'Removed from wishlist', inWishlist: false, wishlist: user.wishlist });
    } else {

      user.wishlist.push(productId);
      await user.save();
      res.json({ message: 'Added to wishlist', inWishlist: true, wishlist: user.wishlist });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:productId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
    await user.save();
    res.json({ message: 'Removed from wishlist', wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;