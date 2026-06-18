const { Payslip } = require('../models/models');
const Task = require('../models/Task');

// POST /api/payroll/generate
exports.generatePayslip = async (req, res) => {
  try {
    const { employeeId, period, periodStart, periodEnd, bonus = 0, deductions = 0, currency = 'LKR', notes, businessDetails } = req.body;

    const targetEmployee = req.user.role === 'admin' ? employeeId : req.user._id;

    // Get approved/paid tasks for this employee in the period
    const taskFilter = {
      employee: targetEmployee,
      status: { $in: ['Approved', 'Paid'] },
      currency,
    };
    if (periodStart && periodEnd) {
      taskFilter.dateCompleted = { $gte: new Date(periodStart), $lte: new Date(periodEnd) };
    }

    const tasks = await Task.find(taskFilter);
    const grossAmount = tasks.reduce((s, t) => s + (t.approvedAmount || t.requestedAmount || 0), 0);
    const netAmount = grossAmount + Number(bonus) - Number(deductions);

    const payslip = await Payslip.create({
      employee: targetEmployee,
      period, periodStart, periodEnd,
      tasks: tasks.map(t => t._id),
      grossAmount, deductions: Number(deductions), bonus: Number(bonus), netAmount,
      currency, notes, businessDetails,
      generatedBy: req.user._id,
      status: 'issued',
    });

    await payslip.populate('employee', 'name employeeId position email');
    await payslip.populate('tasks');

    res.status(201).json({ payslip });
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
