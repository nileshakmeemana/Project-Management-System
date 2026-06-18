const Task = require('../models/Task');
const { Activity } = require('../models/models');

const log = async (action, actor, target) => {
  try { await Activity.create({ action, actor: actor._id, actorName: actor.name, target, category: 'task' }); } catch {}
};

// GET /api/tasks  — admin gets all, employee gets own
exports.getTasks = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { employee: req.user._id };
    const { status, search, page = 1, limit = 50 } = req.query;
    if (status && status !== 'All') filter.status = status;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { clientName: { $regex: search, $options: 'i' } },
      { category:   { $regex: search, $options: 'i' } },
    ];
    const tasks = await Task.find(filter)
      .populate('employee', 'name employeeId')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);
    const total = await Task.countDocuments(filter);
    res.json({ tasks, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const { title, clientName, category, hours, requestedAmount, currency, description, workLink, dateCompleted } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const task = await Task.create({
      title, clientName, category, hours, requestedAmount, currency,
      description, workLink, dateCompleted,
      employee: req.user._id, status: 'Pending Review',
    });
    await log('Submitted task', req.user, title);
    res.status(201).json({ task });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/tasks/:id
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('employee', 'name employeeId email');
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (req.user.role !== 'admin' && task.employee._id.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Forbidden' });
    res.json({ task });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PATCH /api/tasks/:id  — employee edits pending task
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (req.user.role !== 'admin') {
      if (task.employee.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Forbidden' });
      if (!['Pending Review','Changes Requested'].includes(task.status))
        return res.status(400).json({ error: 'Cannot edit approved or paid task' });
    }
    const allowed = ['title','clientName','category','hours','requestedAmount','currency','description','workLink','dateCompleted'];
    allowed.forEach(f => { if (req.body[f] !== undefined) task[f] = req.body[f]; });
    await task.save();
    await log('Updated task', req.user, task.title);
    res.json({ task });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PATCH /api/tasks/:id/review  — admin reviews task
exports.reviewTask = async (req, res) => {
  try {
    const { status, approvedAmount, adminNote } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    task.status = status;
    if (approvedAmount !== undefined) task.approvedAmount = approvedAmount;
    if (adminNote !== undefined) task.adminNote = adminNote;
    task.reviewedBy = req.user._id;
    task.reviewedAt = new Date();
    await task.save();
    await log(`Task ${status.toLowerCase()}`, req.user, task.title);
    res.json({ task });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (req.user.role !== 'admin' && task.employee.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Forbidden' });
    await task.deleteOne();
    await log('Deleted task', req.user, task.title);
    res.json({ message: 'Task deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
