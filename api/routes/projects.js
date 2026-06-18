const router = require('express').Router();
const { Project } = require('../models/models');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/', async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { employee: req.user._id };
  res.json({ projects: await Project.find(filter).populate('employee','name').sort({ createdAt: -1 }) });
});
router.post('/', async (req, res) => {
  const p = await Project.create({ ...req.body, employee: req.user._id }); res.status(201).json({ project: p });
});
router.patch('/:id', async (req, res) => {
  const p = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ project: p });
});
router.delete('/:id', async (req, res) => { await Project.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); });
module.exports = router;
