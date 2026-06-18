const router = require('express').Router();
const { Activity } = require('../models/models');
const { protect, adminOnly } = require('../middleware/auth');
router.get('/', protect, adminOnly, async (req, res) => {
  const { category, page = 1, limit = 50 } = req.query;
  const filter = category ? { category } : {};
  const logs = await Activity.find(filter).populate('actor','name').sort({ createdAt: -1 }).skip((+page-1)*+limit).limit(+limit);
  res.json({ logs, total: await Activity.countDocuments(filter) });
});
module.exports = router;
