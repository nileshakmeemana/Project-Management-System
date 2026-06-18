const router = require('express').Router();
const { Category } = require('../models/models');
const { protect, adminOnly } = require('../middleware/auth');
router.use(protect);
router.get('/',       async (req, res) => { res.json({ categories: await Category.find({ status: 'active' }).sort({ name: 1 }) }); });
router.post('/',      adminOnly, async (req, res) => { const c = await Category.create(req.body); res.status(201).json({ category: c }); });
router.patch('/:id',  adminOnly, async (req, res) => { const c = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ category: c }); });
router.delete('/:id', adminOnly, async (req, res) => { await Category.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); });
module.exports = router;
