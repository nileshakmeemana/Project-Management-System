const mongoose = require('mongoose');

// ── Client ──────────────────────────────────────
const clientSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  contact: { type: String, default: '' },
  email:   { type: String, default: '' },
  currency:{ type: String, enum: ['LKR','AUD','USD'], default: 'LKR' },
  status:  { type: String, enum: ['active','inactive'], default: 'active' },
}, { timestamps: true });
const Client = mongoose.model('Client', clientSchema);

// ── Project ─────────────────────────────────────
const projectSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  client:   { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName:{ type: String, default: '' },
  employee:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },           // legacy single assignee
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],          // 1..n assignees
  status:   { type: String, enum: ['in-progress','completed','on-hold'], default: 'in-progress' },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  value:    { type: Number, default: 0 },
  currency: { type: String, enum: ['LKR','AUD','USD'], default: 'LKR' },
  due:      { type: Date },
}, { timestamps: true });
const Project = mongoose.model('Project', projectSchema);

// ── Task Category ────────────────────────────────
const categorySchema = new mongoose.Schema({
  name:   { type: String, required: true, unique: true, trim: true },
  desc:   { type: String, default: '' },
  status: { type: String, enum: ['active','inactive'], default: 'active' },
}, { timestamps: true });
const Category = mongoose.model('Category', categorySchema);

// ── Payslip ──────────────────────────────────────
const payslipSchema = new mongoose.Schema({
  employee:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  period:      { type: String, required: true },           // e.g. "June 2026"
  periodStart: { type: Date },
  periodEnd:   { type: Date },
  tasks:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  grossAmount: { type: Number, default: 0 },
  deductions:  { type: Number, default: 0 },
  bonus:       { type: Number, default: 0 },
  netAmount:   { type: Number, default: 0 },
  currency:    { type: String, enum: ['LKR','AUD','USD'], default: 'LKR' },
  payType:     { type: String, default: 'Per Task' },
  status:      { type: String, enum: ['draft','issued','paid'], default: 'draft' },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paidAt:      { type: Date },
  notes:       { type: String, default: '' },
  businessDetails: {
    name:     { type: String, default: 'Designer Craft' },
    address:  { type: String, default: '' },
    email:    { type: String, default: '' },
    phone:    { type: String, default: '' },
    authorized: { type: String, default: '' },
    authPosition: { type: String, default: '' },
  }
}, { timestamps: true });
const Payslip = mongoose.model('Payslip', payslipSchema);

// ── Activity Log ─────────────────────────────────
const activitySchema = new mongoose.Schema({
  action:   { type: String, required: true },
  actor:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName:{ type: String, default: '' },
  target:   { type: String, default: '' },
  category: { type: String, enum: ['task','payroll','employee','settings','auth','project'], default: 'task' },
  meta:     { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });
const Activity = mongoose.model('Activity', activitySchema);

// ── Deadline ─────────────────────────────────────
const deadlineSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  date:      { type: Date, required: true },
  color:     { type: String, default: '#005bd3' },
  employee:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },          // legacy single assignee
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],        // 1..n assignees
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
const Deadline = mongoose.model('Deadline', deadlineSchema);

// ── Settings ─────────────────────────────────────
const settingsSchema = new mongoose.Schema({
  key:   { type: String, unique: true },
  value: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });
const Settings = mongoose.model('Settings', settingsSchema);

// ── Invoice ──────────────────────────────────────
const invoiceSchema = new mongoose.Schema({
  number:      { type: String, required: true, unique: true },
  project:     { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  projectName: { type: String, default: '' },
  clientName:  { type: String, default: '' },
  description: { type: String, default: '' },
  amount:      { type: Number, default: 0 },                        // base project value
  addons:      [{ description: String, amount: Number }],           // extra line items
  total:       { type: Number, default: 0 },
  currency:    { type: String, enum: ['LKR','AUD','USD'], default: 'LKR' },
  status:      { type: String, enum: ['draft','sent','paid','overdue'], default: 'draft' },
  date:        { type: Date, default: Date.now },
  dueDate:     { type: Date },
  paidAt:      { type: Date },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = { Client, Project, Category, Payslip, Activity, Deadline, Settings, Invoice };
