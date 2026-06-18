const router = require('express').Router();
const c = require('../controllers/payrollController');
const { protect, adminOnly } = require('../middleware/auth');
router.use(protect);
router.get('/',              c.getPayslips);
router.post('/generate',     c.generatePayslip);
router.get('/:id',           c.getPayslip);
router.patch('/:id/status',  adminOnly, c.updateStatus);
module.exports = router;
