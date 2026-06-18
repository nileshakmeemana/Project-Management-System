const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');
const { Activity } = require('../models/models');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const logActivity = async (action, actor, target, category = 'auth') => {
  try {
    await Activity.create({ action, actor: actor?._id, actorName: actor?.name || 'System', target, category });
  } catch {}
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const user = await User.create({ name, email, password, role: role === 'admin' ? 'admin' : 'employee' });
    await logActivity('User registered', user, user.email);

    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    await logActivity('Signed in', user, user.email);

    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/google
exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (user) {
      user.googleId = googleId;
      user.avatar = user.avatar || picture;
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });
    } else {
      user = await User.create({ name, email, googleId, avatar: picture, role: 'employee' });
    }

    await logActivity('Signed in via Google', user, email);
    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(401).json({ error: 'Google authentication failed: ' + err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ user: req.user.toPublic ? req.user.toPublic() : req.user });
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  await logActivity('Signed out', req.user, req.user?.email || '');
  res.json({ message: 'Logged out successfully' });
};
