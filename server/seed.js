const mongoose = require('mongoose');
const Product = require('./models/Product');

const medicines = [
  { name: 'Panadol 500mg', price: 50, image: '/images/medicine_image.jpg', category: 'Pain Relief', description: 'Used for fever and mild to moderate pain relief.' },
  { name: 'Lorin-NSA 10mg', price: 120, image: '/images/medicine_image.jpg', category: 'Allergy', description: 'Effective antihistamine for allergic reactions.' },
  { name: 'Rigix 10mg', price: 150, image: '/images/rigix.jpg', category: 'Allergy', description: 'Relief from cold, flu, and allergy symptoms.' },
  { name: 'Brufen 400mg', price: 80, image: '/images/medicine_image.jpg', category: 'Pain Relief', description: 'Anti-inflammatory drug for pain and swelling.' },
  { name: 'Gravinate 50mg', price: 40, image: '/images/medicine_image.jpg', category: 'Stomach', description: 'Used for nausea, vomiting, and dizziness.' },
  { name: 'Glucophage 500mg', price: 200, image: '/images/glucophage.jpg', category: 'Diabetes', description: 'Used to control high blood sugar levels.' },
  { name: 'Arinac 200mg/30mg', price: 110, image: '/images/medicine_image.jpg', category: 'Cold & Flu', description: 'Dual action for congestion and pain relief.' },
  { name: 'Augmentin 625mg', price: 450, image: '/images/medicine_image.jpg', category: 'Antibiotic', description: 'Broad-spectrum antibiotic for infections.' },
  { name: 'Flagyl 400mg', price: 90, image: '/images/medicine_image.jpg', category: 'Antibiotic', description: 'Used for various bacterial and parasitic infections.' },
  { name: 'Ponstan Forte 500mg', price: 70, image: '/images/medicine_image.jpg', category: 'Pain Relief', description: 'Specialized relief for period pain and inflammatory pain.' },
  { name: 'Surbex-Z', price: 300, image: '/images/medicine_image.jpg', category: 'Multivitamin', description: 'Essential vitamins with Zinc for daily energy and health.' }
];

mongoose.connect('mongodb://localhost:27017/medicine_store')
  .then(async () => {
    await Product.deleteMany({});
    await Product.insertMany(medicines);
    console.log('Database seeded with medicines');
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });