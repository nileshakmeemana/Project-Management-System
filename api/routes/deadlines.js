const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { Deadline, Activity } = require('../models/models');

router.use(protect);

const log = async (action, actor, target) => {
  try { await Activity.create({ action, actor: actor._id, actorName: actor.name, target, category: 'project' }); } catch {}
};

// GET /api/deadlines — admin sees all; employee sees only deadlines assigned to them
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? {}
      : { $or: [{ employees: req.user._id }, { employee: req.user._id }] };
    const deadlines = await Deadline.find(filter)
      .populate('employees', 'name')
      .populate('employee', 'name')
      .sort({ date: 1 });
    res.json({ deadlines });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/deadlines — admin assigns to 1..n employees; employee creates personal deadline
router.post('/', async (req, res) => {
  try {
    const { title, date, color, employees } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Title and date required' });
    const assigned = req.user.role === 'admin'
      ? (Array.isArray(employees) ? employees.filter(Boolean) : [])
      : [req.user._id];
    const deadline = await Deadline.create({ title, date, color, employees: assigned, createdBy: req.user._id });
    await deadline.populate('employees', 'name');
    await log('Added deadline', req.user, title);
    res.status(201).json({ deadline });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/deadlines/:id
router.patch('/:id', async (req, res) => {
  try {
    const dl = await Deadline.findById(req.params.id);
    if (!dl) return res.status(404).json({ error: 'Deadline not found' });
    if (req.user.role !== 'admin' && dl.createdBy?.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Forbidden' });
    const { title, date, color, employees } = req.body;
    if (title !== undefined) dl.title = title;
    if (date !== undefined) dl.date = date;
    if (color !== undefined) dl.color = color;
    if (employees !== undefined && req.user.role === 'admin') dl.employees = employees.filter(Boolean);
    await dl.save();
    await dl.populate('employees', 'name');
    await log('Updated deadline', req.user, dl.title);
    res.json({ deadline: dl });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/deadlines/:id
router.delete('/:id', async (req, res) => {
  try {
    const dl = await Deadline.findById(req.params.id);
    if (!dl) return res.status(404).json({ error: 'Deadline not found' });
    if (req.user.role !== 'admin' && dl.createdBy?.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Forbidden' });
    await dl.deleteOne();
    await log('Deleted deadline', req.user, dl.title);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
