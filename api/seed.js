// Run once to populate the database:
//   MONGODB_URI=<your-uri> JWT_SECRET=any node api/seed.js
// Or locally:
//   node api/seed.js  (reads .env.local via dotenv)

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const mongoose = require('mongoose');
const User     = require('./models/User');
const Task     = require('./models/Task');
const { Client, Project, Category, Activity } = require('./models/models');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  Connected');

  await Promise.all([User.deleteMany(), Task.deleteMany(), Client.deleteMany(), Project.deleteMany(), Category.deleteMany(), Activity.deleteMany()]);
  console.log('🗑️   Cleared');

  const admin = new User({ name:'Nilesh Akmeemana', email:'admin@designercraft.com', password:'admin123', role:'admin', position:'Owner / Manager' });
  await admin.save();

  const emp1 = new User({ name:'Gayani Diaz',  email:'gayani@designercraft.com', password:'emp123', role:'employee', position:'Creative Assistant', currency:'LKR' });
  await emp1.save();
  const emp2 = new User({ name:'Sara Kim',     email:'sara@designercraft.com',   password:'emp123', role:'employee', position:'Designer',           currency:'LKR' });
  await emp2.save();
  const emp3 = new User({ name:'Tom Wright',   email:'tom@designercraft.com',    password:'emp123', role:'employee', position:'Content Writer',      currency:'LKR' });
  await emp3.save();
  console.log('👥  Users created');

  await Client.insertMany([
    { name:'Second Page',       email:'contact@secondpage.com',     currency:'LKR' },
    { name:'Nail Toolz',        email:'hello@nailtoolz.com.au',     currency:'AUD' },
    { name:'Dental On Demand',  email:'info@dentalod.com.au',       currency:'AUD' },
    { name:'ANVAYA Wellness',   email:'hello@anvaya.com',           currency:'LKR' },
    { name:'Amaree Collective', email:'studio@amaree.com',          currency:'LKR' },
    { name:'Port Stephens',     email:'contact@portstephens.com.au',currency:'AUD' },
  ]);

  await Category.insertMany([
    'Graphic Design','Social Media Content','Reel Editing','Website Update',
    'SEO Setup','Admin Work','Content Writing','Product Upload','Email Marketing','Custom Task',
  ].map(name => ({ name })));

  await Task.insertMany([
    { title:'Website banner refresh',    employee:emp1._id, clientName:'Nail Toolz',       category:'Website Update',      hours:4.5, requestedAmount:18500, approvedAmount:18500, currency:'LKR', status:'Approved', dateCompleted:new Date('2026-06-01') },
    { title:'LinkedIn service carousel', employee:emp1._id, clientName:'Second Page',       category:'Social Media Content',hours:3,   requestedAmount:12000, approvedAmount:12000, currency:'LKR', status:'Paid',     dateCompleted:new Date('2026-06-03') },
    { title:'SEO setup notes',           employee:emp2._id, clientName:'Dental On Demand',  category:'SEO Setup',           hours:2.25,requestedAmount:9000,  approvedAmount:9000,  currency:'LKR', status:'Paid',     dateCompleted:new Date('2026-06-04') },
    { title:'Instagram reels batch',     employee:emp1._id, clientName:'ANVAYA Wellness',   category:'Reel Editing',        hours:5,   requestedAmount:20000, currency:'LKR', status:'Changes Requested', dateCompleted:new Date('2026-06-07') },
    { title:'Product upload — skin kit', employee:emp2._id, clientName:'Nail Toolz',        category:'Product Upload',      hours:2,   requestedAmount:7500,  currency:'LKR', status:'Rejected',          dateCompleted:new Date('2026-06-09') },
    { title:'Facebook ad creatives',     employee:emp3._id, clientName:'Amaree Collective', category:'Graphic Design',      hours:3.5, requestedAmount:14000, approvedAmount:14000, currency:'LKR', status:'Approved', dateCompleted:new Date('2026-06-11') },
    { title:'Email marketing sequence',  employee:emp1._id, clientName:'Port Stephens',     category:'Email Marketing',     hours:4,   requestedAmount:16000, approvedAmount:16000, currency:'LKR', status:'Approved', dateCompleted:new Date('2026-06-12') },
    { title:'Blog posts — design trends',employee:emp3._id, clientName:'Second Page',       category:'Content Writing',     hours:6,   requestedAmount:24000, approvedAmount:24000, currency:'LKR', status:'Approved', dateCompleted:new Date('2026-06-13') },
  ]);
  console.log('📋  Tasks created');

  console.log('\n✅  Seed complete!');
  console.log('   admin@designercraft.com  / admin123');
  console.log('   gayani@designercraft.com / emp123');
  await mongoose.disconnect();
}
seed().catch(e => { console.error('❌', e.message); process.exit(1); });
