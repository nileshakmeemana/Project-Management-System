const router = require('express').Router();
const { Client } = require('../models/models');
const { protect, adminOnly } = require('../middleware/auth');
router.use(protect);
router.get('/',        async (req, res) => { res.json({ clients: await Client.find().sort({ name: 1 }) }); });
router.post('/',       adminOnly, async (req, res) => { const c = await Client.create(req.body); res.status(201).json({ client: c }); });
router.patch('/:id',   adminOnly, async (req, res) => { const c = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ client: c }); });
router.delete('/:id',  adminOnly, async (req, res) => { await Client.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); });
module.exports = router;
