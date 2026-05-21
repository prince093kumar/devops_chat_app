const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connUri = process.env.MONGO_URI || 'mongodb://localhost:27017/notification_db';
    const conn = await mongoose.connect(connUri);
    console.log(`📡 Notification DB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Notification Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
