const Task = require('../models/Task');
const User = require('../models/User');
const { Project, Activity } = require('../models/models');

// GET /api/dashboard/admin
exports.adminDashboard = async (req, res) => {
  try {
    const [
      totalEmployees, pendingTasks, approvedTasks, allTasks,
      recentActivity, projects
    ] = await Promise.all([
      User.countDocuments({ role: 'employee' }),
      Task.countDocuments({ status: 'Pending Review' }),
      Task.find({ status: { $in: ['Approved','Paid'] } }),
      Task.find().populate('employee', 'name').sort({ createdAt: -1 }).limit(20),
      Activity.find().populate('actor', 'name').sort({ createdAt: -1 }).limit(10),
      Project.find().limit(10),
    ]);

    const totalHours = allTasks.reduce((s, t) => s + (t.hours || 0), 0);

    // Approved amount by currency
    const approvedByCurrency = {};
    approvedTasks.forEach(t => {
      const c = t.currency || 'LKR';
      approvedByCurrency[c] = (approvedByCurrency[c] || 0) + (t.approvedAmount || t.requestedAmount || 0);
    });

    // Client profitability
    const clientProfit = {};
    approvedTasks.forEach(t => {
      const k = t.clientName || 'Other';
      clientProfit[k] = (clientProfit[k] || 0) + (t.approvedAmount || t.requestedAmount || 0);
    });

    // Monthly earnings (last 6 months)
    const now = new Date();
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const monthTasks = allTasks.filter(t => {
        const tc = new Date(t.createdAt);
        return tc.getFullYear() === d.getFullYear() && tc.getMonth() === d.getMonth();
      });
      const approved = monthTasks.filter(t => ['Approved','Paid'].includes(t.status)).reduce((s,t)=>s+(t.approvedAmount||t.requestedAmount||0),0);
      const pending  = monthTasks.filter(t => t.status === 'Pending Review').reduce((s,t)=>s+(t.requestedAmount||0),0);
      monthlyData.push({ label, approved, pending });
    }

    res.json({
      stats: { totalEmployees, pendingTasks, totalHours, approvedByCurrency },
      pendingList: allTasks.filter(t => t.status === 'Pending Review').slice(0, 5),
      clientProfit,
      monthlyData,
      recentActivity,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/dashboard/employee
exports.employeeDashboard = async (req, res) => {
  try {
    const tasks = await Task.find({ employee: req.user._id }).sort({ createdAt: -1 });
    const projects = await Project.find({ employee: req.user._id });

    const totalHours = tasks.reduce((s, t) => s + (t.hours || 0), 0);

    const requestedByCurrency = {};
    tasks.forEach(t => {
      const c = t.currency || 'LKR';
      requestedByCurrency[c] = (requestedByCurrency[c] || 0) + (t.requestedAmount || 0);
    });

    const approvedByCurrency = {};
    tasks.filter(t => ['Approved','Paid'].includes(t.status)).forEach(t => {
      const c = t.currency || 'LKR';
      approvedByCurrency[c] = (approvedByCurrency[c] || 0) + (t.approvedAmount || t.requestedAmount || 0);
    });

    // Monthly earnings
    const now = new Date();
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const monthTasks = tasks.filter(t => {
        const tc = new Date(t.createdAt);
        return tc.getFullYear() === d.getFullYear() && tc.getMonth() === d.getMonth();
      });
      monthlyData.push({
        label,
        approved: monthTasks.filter(t=>['Approved','Paid'].includes(t.status)).reduce((s,t)=>s+(t.approvedAmount||t.requestedAmount||0),0),
        pending:  monthTasks.filter(t=>t.status==='Pending Review').reduce((s,t)=>s+(t.requestedAmount||0),0),
      });
    }

    res.json({
      stats: { totalHours, requestedByCurrency, approvedByCurrency, totalTasks: tasks.length },
      recentTasks: tasks.slice(0, 5),
      pendingTasks: tasks.filter(t => t.status === 'Pending Review').slice(0, 5),
      projects: projects.slice(0, 5),
      monthlyData,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
