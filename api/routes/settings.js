const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { Settings, Activity } = require('../models/models');

const KEY = 'app';

const DEFAULTS = {
  baseCurrency: 'LKR',                       // LKR | AUD | USD
  dateFormat:   'DD/MM/YYYY',                // DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD
  timezone:     'Asia/Colombo',
  approvalMode: 'email-admin',               // email-admin | email-only | admin-only
  business: {
    name: 'Designer Craft', address: '', email: '', phone: '',
    authorized: '', authPosition: '', invoicePrefix: 'INV-',
    payslipNote: '',
  },
};

// GET /api/settings — any authenticated user (employees may need currency/date format)
router.get('/', protect, async (req, res) => {
  try {
    const doc = await Settings.findOne({ key: KEY });
    res.json({ settings: { ...DEFAULTS, ...(doc?.value || {}), business: { ...DEFAULTS.business, ...(doc?.value?.business || {}) } } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/settings — admin only
router.put('/', protect, adminOnly, async (req, res) => {
  try {
    const doc = await Settings.findOne({ key: KEY });
    const merged = { ...DEFAULTS, ...(doc?.value || {}), ...req.body,
      business: { ...DEFAULTS.business, ...(doc?.value?.business || {}), ...(req.body.business || {}) } };
    const saved = await Settings.findOneAndUpdate(
      { key: KEY }, { key: KEY, value: merged }, { upsert: true, new: true }
    );
    try { await Activity.create({ action: 'Updated settings', actor: req.user._id, actorName: req.user.name, category: 'settings' }); } catch {}
    res.json({ settings: saved.value });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
