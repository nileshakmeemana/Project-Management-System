const router = require('express').Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
router.use(protect);
router.get('/', adminOnly, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users });
});
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: user.toPublic() });
});
router.patch('/me', async (req, res) => {
  const { name, position, phone, currency, payType } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { name, position, phone, currency, payType }, { new: true });
  res.json({ user: user.toPublic() });
});
router.patch('/:id', adminOnly, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ user: user.toPublic() });
});
router.delete('/:id', adminOnly, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});
module.exports = router;
