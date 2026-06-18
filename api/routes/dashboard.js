const router = require('express').Router();
const c = require('../controllers/dashboardController');
const { protect, adminOnly } = require('../middleware/auth');
router.get('/admin',    protect, adminOnly, c.adminDashboard);
router.get('/employee', protect, c.employeeDashboard);
module.exports = router;
