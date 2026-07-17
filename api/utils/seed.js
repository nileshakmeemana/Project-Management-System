require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const { Client, Project, Category, Activity } = require('../models/models');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  Connected to MongoDB');

  await Promise.all([User.deleteMany(), Task.deleteMany(), Client.deleteMany(), Project.deleteMany(), Category.deleteMany(), Activity.deleteMany()]);
  console.log('🗑️   Cleared existing data');

  // Use .save() for every user so pre-save hook hashes passwords
  const admin = new User({ name:'Nilesh Akmeemana', email:'admin@designercraft.com', password:'admin123', role:'admin', position:'Owner / Manager' });
  await admin.save();

  const emp1 = new User({ name:'Gayani Diaz',  email:'gayani@designercraft.com', password:'emp123', role:'employee', position:'Creative Assistant', currency:'LKR', payType:'Per Task' });
  await emp1.save();
  const emp2 = new User({ name:'Sara Kim',     email:'sara@designercraft.com',   password:'emp123', role:'employee', position:'Designer',           currency:'LKR', payType:'Per Task' });
  await emp2.save();
  const emp3 = new User({ name:'Tom Wright',   email:'tom@designercraft.com',    password:'emp123', role:'employee', position:'Content Writer',      currency:'LKR', payType:'Per Task' });
  await emp3.save();

  console.log('👥  Users created (passwords properly hashed)');

  const clients = await Client.insertMany([
    { name:'Second Page',       email:'contact@secondpage.com',    currency:'LKR' },
    { name:'Nail Toolz',        email:'hello@nailtoolz.com.au',    currency:'AUD' },
    { name:'Dental On Demand',  email:'info@dentalod.com.au',      currency:'AUD' },
    { name:'ANVAYA Wellness',   email:'hello@anvaya.com',          currency:'LKR' },
    { name:'Amaree Collective', email:'studio@amaree.com',         currency:'LKR' },
    { name:'Port Stephens',     email:'contact@portstephens.com.au',currency:'AUD' },
  ]);
  console.log('🏢  Clients:', clients.length);

  await Category.insertMany([
    { name:'Graphic Design' }, { name:'Social Media Content' }, { name:'Reel Editing' },
    { name:'Website Update' }, { name:'SEO Setup' }, { name:'Admin Work' },
    { name:'Content Writing' }, { name:'Product Upload' }, { name:'Email Marketing' }, { name:'Custom Task' },
  ]);
  console.log('🏷️   Categories: 10');

  await Project.insertMany([
    { name:'Nail Toolz Website Refresh',    clientName:'Nail Toolz',       employee:emp1._id, status:'in-progress', progress:65,  value:85000,  currency:'LKR', due:new Date('2026-07-15') },
    { name:'ANVAYA Social Media Package',   clientName:'ANVAYA Wellness',  employee:emp1._id, status:'in-progress', progress:40,  value:60000,  currency:'LKR', due:new Date('2026-07-30') },
    { name:'Dental On Demand SEO Setup',    clientName:'Dental On Demand', employee:emp2._id, status:'completed',   progress:100, value:45000,  currency:'LKR', due:new Date('2026-06-10') },
    { name:'Second Page Content Strategy',  clientName:'Second Page',      employee:emp2._id, status:'in-progress', progress:55,  value:72000,  currency:'LKR', due:new Date('2026-08-01') },
  ]);
  console.log('📁  Projects: 4');

  await Task.insertMany([
    { title:'Website banner refresh',     employee:emp1._id, clientName:'Nail Toolz',        category:'Website Update',       hours:4.5, requestedAmount:18500, approvedAmount:18500, currency:'LKR', status:'Approved',           dateCompleted:new Date('2026-06-01'), adminNote:'Great work.' },
    { title:'LinkedIn service carousel',  employee:emp1._id, clientName:'Second Page',        category:'Social Media Content', hours:3,   requestedAmount:12000, approvedAmount:12000, currency:'LKR', status:'Paid',               dateCompleted:new Date('2026-06-03'), adminNote:'Paid.' },
    { title:'SEO setup notes',            employee:emp2._id, clientName:'Dental On Demand',   category:'SEO Setup',            hours:2.25,requestedAmount:9000,  approvedAmount:9000,  currency:'LKR', status:'Paid',               dateCompleted:new Date('2026-06-04'), adminNote:'Paid.' },
    { title:'Instagram reels batch',      employee:emp1._id, clientName:'ANVAYA Wellness',    category:'Reel Editing',         hours:5,   requestedAmount:20000, approvedAmount:0,     currency:'LKR', status:'Changes Requested',  dateCompleted:new Date('2026-06-07'), adminNote:'Please add captions.' },
    { title:'Product upload — skin kit',  employee:emp2._id, clientName:'Nail Toolz',         category:'Product Upload',       hours:2,   requestedAmount:7500,  approvedAmount:0,     currency:'LKR', status:'Rejected',           dateCompleted:new Date('2026-06-09'), adminNote:'Wrong category.' },
    { title:'Facebook ad creatives',      employee:emp3._id, clientName:'Amaree Collective',  category:'Graphic Design',       hours:3.5, requestedAmount:14000, approvedAmount:14000, currency:'LKR', status:'Approved',           dateCompleted:new Date('2026-06-11'), adminNote:'Approved.' },
    { title:'Email marketing sequence',   employee:emp1._id, clientName:'Port Stephens',      category:'Email Marketing',      hours:4,   requestedAmount:16000, approvedAmount:0,     currency:'LKR', status:'Pending Review',     dateCompleted:new Date('2026-06-12') },
    { title:'Blog posts — design trends', employee:emp3._id, clientName:'Second Page',        category:'Content Writing',      hours:6,   requestedAmount:24000, approvedAmount:24000, currency:'LKR', status:'Approved',           dateCompleted:new Date('2026-06-13'), adminNote:'Well written.' },
  ]);
  console.log('📋  Tasks: 8');

  console.log('\n✅  Seed complete!');
  console.log('   Admin:    admin@designercraft.com  / admin123');
  console.log('   Employee: gayani@designercraft.com / emp123');
  console.log('   Employee: sara@designercraft.com   / emp123');
  await mongoose.disconnect();
}

seed().catch(e => { console.error('❌', e.message); process.exit(1); });
