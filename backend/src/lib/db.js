const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/visitor_pass';
  try {
    await mongoose.connect(uri, {
      // Mongoose v7 no longer requires these but harmless to include
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected:', uri.includes('@') ? '(Atlas)' : '(local)');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

module.exports = { connectDB };