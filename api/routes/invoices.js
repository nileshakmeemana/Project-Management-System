const router = require('express').Router();
const { Invoice, Project, Settings, Activity } = require('../models/models');
const Task = require('../models/Task');
const { protect, adminOnly } = require('../middleware/auth');
router.use(protect, adminOnly);   // invoices are admin-only

const log = async (action, actor, target) => {
  try { await Activity.create({ action, actor: actor._id, actorName: actor.name, target, category: 'payment' }); } catch {}
};

const computeTotal = (amount, addons = []) =>
  (Number(amount) || 0) + addons.reduce((s, a) => s + (Number(a.amount) || 0), 0);

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find().populate('project', 'name status value').sort({ date: -1 });
    res.json({ invoices });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/invoices — create from a project (or standalone)
router.post('/', async (req, res) => {
  try {
    const { project: projectId, addons = [], ...rest } = req.body;
    let project = null;
    if (projectId) {
      project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
    }

    // Auto-number using the configured prefix
    const doc = await Settings.findOne({ key: 'app' });
    const prefix = doc?.value?.payslip?.invoicePrefix || doc?.value?.business?.invoicePrefix || 'INV-';
    const count = await Invoice.countDocuments();
    const number = rest.number || `${prefix}${String(count + 1).padStart(4, '0')}`;

    const amount = rest.amount ?? project?.value ?? 0;
    const invoice = await Invoice.create({
      ...rest, number, addons,
      project: project?._id, projectName: project?.name || rest.projectName || '',
      clientName: rest.clientName || project?.clientName || '',
      currency: rest.currency || project?.currency || 'LKR',
      amount, total: computeTotal(amount, addons),
      createdBy: req.user._id,
    });
    await log('Created invoice', req.user, invoice.number);
    res.status(201).json({ invoice });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/invoices/:id — edit / change status (mark paid when client approves)
router.patch('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const { addons, amount, status, ...rest } = req.body;
    Object.assign(invoice, rest);
    if (addons !== undefined) invoice.addons = addons;
    if (amount !== undefined) invoice.amount = amount;
    if (status !== undefined) {
      invoice.status = status;
      if (status === 'paid' && !invoice.paidAt) invoice.paidAt = new Date();
    }
    invoice.total = computeTotal(invoice.amount, invoice.addons);
    await invoice.save();
    await log(`Invoice ${invoice.number} → ${invoice.status}`, req.user, invoice.number);
    res.json({ invoice });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    const inv = await Invoice.findByIdAndDelete(req.params.id);
    if (inv) await log('Deleted invoice', req.user, inv.number);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
