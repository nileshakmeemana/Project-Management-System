// routes/auth.js
const router = require('express').Router();
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');
router.post('/register', c.register);
router.post('/login',    c.login);
router.post('/google',   c.googleAuth);
router.get('/me',        protect, c.me);
router.post('/logout',   protect, c.logout);
module.exports = router;
