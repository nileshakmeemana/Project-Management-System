const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, select: false },
  role:       { type: String, enum: ['admin', 'employee'], default: 'employee' },
  position:   { type: String, default: '' },
  phone:      { type: String, default: '' },
  currency:   { type: String, enum: ['LKR','AUD','USD'], default: 'LKR' },
  payType:    { type: String, enum: ['Per Task','Hourly','Monthly'], default: 'Per Task' },
  employeeId: { type: String },
  status:     { type: String, enum: ['active','inactive','pending'], default: 'active' },
  avatar:     { type: String, default: '' },
  googleId:   { type: String },
  lastLogin:  { type: Date },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Auto-generate employeeId
userSchema.pre('save', async function (next) {
  if (this.isNew && !this.employeeId) {
    const count = await mongoose.model('User').countDocuments();
    this.employeeId = `EMP-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.googleId;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
