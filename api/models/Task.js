const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title:           { type: String, required: true, trim: true },
  employee:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  client:          { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName:      { type: String, default: '' },
  category:        { type: String, default: '' },
  hours:           { type: Number, default: 0 },
  requestedAmount: { type: Number, default: 0 },
  approvedAmount:  { type: Number, default: 0 },
  currency:        { type: String, enum: ['LKR','AUD','USD'], default: 'LKR' },
  status: {
    type: String,
    enum: ['Assigned','Accepted','Declined','Pending Review','Approved','Rejected','Changes Requested','Paid','Archived'],
    default: 'Pending Review'
  },
  projects:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  projectNames: [{ type: String }],
  customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  paidAt:       { type: Date },
  assignedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acceptedAt:   { type: Date },
  declinedAt:   { type: Date },
  description:  { type: String, default: '' },
  workLink:     { type: String, default: '' },
  adminNote:    { type: String, default: '' },
  dateCompleted:{ type: Date },
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:   { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
