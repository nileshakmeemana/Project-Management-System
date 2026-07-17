const { Payslip, Settings } = require('../models/models');
const Task = require('../models/Task');
const { convert } = require('../utils/fx');

// POST /api/payroll/generate
exports.generatePayslip = async (req, res) => {
  try {
    const { employeeId, period, periodStart, periodEnd, bonus = 0, deductions = 0, currency = 'LKR', notes, businessDetails, regenerate, projectId, projectName } = req.body;

    // Snapshot the configured payslip settings onto the slip
    let bizSnapshot = businessDetails;
    try {
      const doc = await Settings.findOne({ key: 'app' });
      bizSnapshot = { ...(doc?.value?.business || {}), ...(doc?.value?.payslip || {}), ...(businessDetails || {}) };
    } catch {}

    const targetEmployee = req.user.role === 'admin' ? employeeId : req.user._id;

    // Prevent generating the same payslip twice for one employee + period —
    // unless regenerate:true, which replaces the existing slip.
    const existing = await Payslip.findOne({ employee: targetEmployee, period });
    let replaced = null;
    if (existing) {
      if (!regenerate) return res.status(409).json({ error: `Payslip already generated for ${period}` });
      replaced = existing._id;
      await existing.deleteOne();
    }

    // Get approved/paid tasks for this employee in the period — in ANY currency.
    // Each task amount is converted from its own currency into the payslip currency.
    const taskFilter = {
      employee: targetEmployee,
      status: { $in: ['Approved', 'Paid'] },
    };
    // Period filter: tasks are matched by dateCompleted, falling back to their
    // creation date when no completion date was recorded (e.g. admin-approved
    // assignments) — previously such tasks were silently dropped.
    if (periodStart || periodEnd) {
      const range = {};
      if (periodStart) range.$gte = new Date(periodStart);
      if (periodEnd) {
        const end = new Date(periodEnd);
        if (end.getHours() === 0 && end.getMinutes() === 0) end.setHours(23, 59, 59, 999); // include the whole end day
        range.$lte = end;
      }
      taskFilter.$or = [
        { dateCompleted: range },
        { dateCompleted: { $in: [null, undefined] }, createdAt: range },
      ];
    }
    // Project-wise payslip: only tasks assigned to the chosen project
    if (projectId) {
      taskFilter.$and = [{ $or: [
        { projects: projectId },
        ...(projectName ? [{ projectNames: projectName }] : []),
      ] }];
    }

    const tasks = await Task.find(taskFilter);
    let grossAmount = 0;
    for (const t of tasks) {
      grossAmount += await convert(t.approvedAmount || t.requestedAmount || 0, t.currency || 'LKR', currency);
    }
    grossAmount = Math.round(grossAmount * 100) / 100;
    const netAmount = grossAmount + Number(bonus) - Number(deductions);

    const payslip = await Payslip.create({
      employee: targetEmployee,
      period, periodStart, periodEnd,
      tasks: tasks.map(t => t._id),
      grossAmount, deductions: Number(deductions), bonus: Number(bonus), netAmount,
      currency, notes, businessDetails: bizSnapshot,
      generatedBy: req.user._id,
      status: 'issued',
    });

    await payslip.populate('employee', 'name employeeId position email');
    await payslip.populate('tasks');

    res.status(201).json({ payslip, replaced });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/payroll
exports.getPayslips = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { employee: req.user._id };
    const payslips = await Payslip.find(filter)
      .populate('employee', 'name employeeId position')
      .sort({ createdAt: -1 });
    res.json({ payslips });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/payroll/:id
exports.getPayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id)
      .populate('employee', 'name employeeId position email phone')
      .populate('tasks');
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
    if (req.user.role !== 'admin' && payslip.employee._id.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Forbidden' });
    res.json({ payslip });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PATCH /api/payroll/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const payslip = await Payslip.findByIdAndUpdate(
      req.params.id,
      { status, ...(status === 'paid' ? { paidAt: new Date() } : {}) },
      { new: true }
    );
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
    res.json({ payslip });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
