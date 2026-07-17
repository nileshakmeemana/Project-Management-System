const router = require('express').Router();
const { Project, Activity, Client } = require('../models/models');
const Task = require('../models/Task');
const { protect, adminOnly } = require('../middleware/auth');
router.use(protect);

const log = async (action, actor, target) => {
  try { await Activity.create({ action, actor: actor._id, actorName: actor.name, target, category: 'project' }); } catch {}
};

// GET /api/projects — employees only see projects assigned to them, WITHOUT the project value
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const filter = isAdmin ? {} : { $or: [{ employees: req.user._id }, { employee: req.user._id }] };
    let projects = await Project.find(filter)
      .populate('employee', 'name')
      .populate('employees', 'name')
      .sort({ createdAt: -1 });
    if (!isAdmin) {
      // Project value is admin-only — employees quote their own price per task
      projects = projects.map(p => { const o = p.toObject(); delete o.value; return o; });
    }
    res.json({ projects });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects — admin only
router.post('/', adminOnly, async (req, res) => {
  try {
    const { employees = [], ...rest } = req.body;
    // Link the actual Client document when the name matches one in the database
    let clientRef;
    if (rest.clientName) {
      const cl = await Client.findOne({ name: rest.clientName });
      if (cl) clientRef = cl._id;
    }
    const p = await Project.create({
      ...rest,
      client: clientRef,
      employees: employees.filter(Boolean),
      employee: employees[0] || undefined,   // legacy field
    });
    await p.populate('employees', 'name');
    await log('Created project', req.user, p.name);
    res.status(201).json({ project: p });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/projects/:id — admin only; completing requires all related tasks approved/paid
router.patch('/:id', adminOnly, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (req.body.status === 'completed' && project.status !== 'completed') {
      const related = await Task.find({ projects: project._id, status: { $nin: ['Archived','Declined'] } });
      const unapproved = related.filter(t => !['Approved','Paid'].includes(t.status));
      if (unapproved.length) {
        return res.status(400).json({
          error: `Cannot complete project — ${unapproved.length} related task(s) still need approval: ${unapproved.slice(0,3).map(t=>`"${t.title}" (${t.status})`).join(', ')}${unapproved.length>3?'…':''}`
        });
      }
    }

    const { employees, ...rest } = req.body;
    Object.assign(project, rest);
    if (rest.clientName !== undefined) {
      const cl = rest.clientName ? await Client.findOne({ name: rest.clientName }) : null;
      project.client = cl ? cl._id : undefined;
    }
    if (employees !== undefined) {
      project.employees = employees.filter(Boolean);
      project.employee = employees[0] || undefined;
    }
    await project.save();
    await project.populate('employees', 'name');
    await log('Updated project', req.user, project.name);
    res.json({ project });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/:id — admin only
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const p = await Project.findByIdAndDelete(req.params.id);
    if (p) await log('Deleted project', req.user, p.name);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
