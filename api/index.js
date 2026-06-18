const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const app        = express();

// ── DB — reuse connection across warm invocations ─────────────────────────
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
}

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    // Allow: no origin (Postman/curl), any vercel.app, any localhost
    if (!origin || /\.vercel\.app$/.test(origin) || /^http:\/\/localhost/.test(origin)) return cb(null, true);
    // Also allow any custom domain set in env
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return cb(null, true);
    cb(null, true); // open during dev — tighten in production if needed
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────────────────────
app.use(async (req, res, next) => { await connectDB(); next(); });

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/tasks',      require('./routes/tasks'));
app.use('/api/clients',    require('./routes/clients'));
app.use('/api/projects',   require('./routes/projects'));
app.use('/api/payroll',    require('./routes/payroll'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/activity',   require('./routes/activity'));
app.use('/api/dashboard',  require('./routes/dashboard'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));

module.exports = app;
