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
// - Employee: submits own completed work → status 'Pending Review'
// - Admin: assigns a task to one or many employees → status 'Assigned' (one task per employee)
exports.createTask = async (req, res) => {
  try {
    const { title, clientName, category, description, employees, employee, projects, projectNames } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    // Only admins create tasks — employees submit work to tasks assigned to them
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Employees cannot create tasks. Submit work to a task assigned to you instead.' });

    const ids = Array.isArray(employees) && employees.length ? employees : (employee ? [employee] : []);
    if (!ids.length || ids.some(id => !id)) return res.status(400).json({ error: 'At least one employee is required' });
    const created = await Task.insertMany(ids.map(id => ({
      title, clientName: clientName || '', category: category || '',
      description: description || '',
      projects: Array.isArray(projects) ? projects.filter(Boolean) : [],
      projectNames: Array.isArray(projectNames) ? projectNames : [],
      employee: id, assignedBy: req.user._id, status: 'Assigned',
    })));
    await log(`Assigned task to ${created.length} employee(s)`, req.user, title);
    res.status(201).json({ tasks: created, task: created[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PATCH /api/tasks/:id/respond  — employee accepts or declines an assigned task
exports.respondTask = async (req, res) => {
  try {
    const { action } = req.body; // 'accept' | 'decline'
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.employee.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Forbidden' });
    if (task.status !== 'Assigned')
      return res.status(400).json({ error: 'Task is not awaiting acceptance' });
    if (action === 'accept') { task.status = 'Accepted'; task.acceptedAt = new Date(); }
    else if (action === 'decline') { task.status = 'Declined'; task.declinedAt = new Date(); }
    else return res.status(400).json({ error: 'Invalid action' });
    await task.save();
    await log(`Task ${action}ed`, req.user, task.title);
    res.json({ task });
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
    const allowed = ['title','clientName','category','hours','requestedAmount','currency','description','workLink','dateCompleted','customFields','projects','projectNames'];
    if (req.user.role === 'admin') allowed.push('employee','status','approvedAmount');
    allowed.forEach(f => { if (req.body[f] !== undefined) task[f] = req.body[f]; });
    await task.save();
    await log('Updated task', req.user, task.title);
    res.json({ task });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PATCH /api/tasks/:id/submit  — employee submits completed work for an assigned task
exports.submitWork = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.employee.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Forbidden' });
    if (!['Assigned','Accepted','Changes Requested'].includes(task.status))
      return res.status(400).json({ error: 'This task cannot receive a submission in its current status' });
    const allowed = ['hours','requestedAmount','currency','description','workLink','dateCompleted','customFields','projects','projectNames'];
    allowed.forEach(f => { if (req.body[f] !== undefined) task[f] = req.body[f]; });
    task.status = 'Pending Review';
    await task.save();
    await log('Submitted work', req.user, task.title);
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
    // Marking as Paid means the work is approved — make sure an approved amount exists
    if (['Approved','Paid'].includes(status) && !task.approvedAmount) {
      task.approvedAmount = task.requestedAmount || 0;
    }
    task.reviewedBy = req.user._id;
    task.reviewedAt = new Date();
    if (status === 'Paid') task.paidAt = new Date();
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
