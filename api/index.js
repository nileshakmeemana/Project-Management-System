const express   = require("express");
const cors      = require("cors");
const connectDB = require("./config/db");

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
// Frontend and API share one Vercel domain, so same-origin requests need no
// CORS at all. This config only matters for localhost dev and Postman.
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || /\.vercel\.app$/.test(origin) || /^http:\/\/localhost/.test(origin)) return cb(null, true);
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return cb(null, true);
    cb(null, true);
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));
app.options("*", cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check — before the DB middleware so it always responds
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date(), env: process.env.NODE_ENV })
);

// ── Database (cached across warm invocations) ───────────────────────────────
app.use(async (req, res, next) => {
  try { await connectDB(); next(); }
  catch (err) { res.status(503).json({ error: "Database unavailable" }); }
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth",       require("./routes/auth"));
app.use("/api/users",      require("./routes/users"));
app.use("/api/tasks",      require("./routes/tasks"));
app.use("/api/clients",    require("./routes/clients"));
app.use("/api/projects",   require("./routes/projects"));
app.use("/api/payroll",    require("./routes/payroll"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/activity",   require("./routes/activity"));
app.use("/api/dashboard",  require("./routes/dashboard"));
app.use("/api/settings",   require("./routes/settings"));
app.use("/api/deadlines",  require("./routes/deadlines"));
app.use("/api/invoices",   require("./routes/invoices"));

// 404 & error handlers
app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

module.exports = app;
