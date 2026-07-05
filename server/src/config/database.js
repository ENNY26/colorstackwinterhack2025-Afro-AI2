const mongoose = require('mongoose');

let reconnectInFlight = null;

/** True when Mongoose has an active connection. */
function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Attempt to restore MongoDB if the connection dropped (e.g. Atlas timeout).
 * Used by auth routes before returning 503.
 */
async function ensureConnected() {
  if (isDbConnected()) return true;

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) return false;

  if (reconnectInFlight) return reconnectInFlight;

  reconnectInFlight = mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    })
    .then(() => {
      console.log(`✅ MongoDB reconnected: ${mongoose.connection.host}`);
      return true;
    })
    .catch((err) => {
      console.warn('⚠️  MongoDB reconnect failed:', err.message);
      return false;
    })
    .finally(() => {
      reconnectInFlight = null;
    });

  return reconnectInFlight;
}

const connectDB = async (retries = 5, delay = 5000) => {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not set in environment variables!');
    console.error('📝 Please create a .env file in the server directory with MONGODB_URI');
    console.error('💡 Example: MONGODB_URI=mongodb://localhost:27017/afro_ai');
    console.error('💡 Or for MongoDB Atlas: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/afro_ai');
    
    // In development, allow server to start without DB (for testing API endpoints)
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_NO_DB === 'true') {
      console.warn('⚠️  Starting server without database connection (ALLOW_NO_DB=true)');
      return;
    }
    
    console.error('❌ Server cannot start without database connection');
    throw new Error('MONGODB_URI is not set');
  }

  // Handle connection events
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });

  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000, // 10 second timeout
        socketTimeoutMS: 45000, // 45 second socket timeout
      });

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${i + 1}/${retries} failed:`, error.message);
      
      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ Failed to connect to MongoDB after all retries');
        console.error('💡 Troubleshooting tips:');
        console.error('   1. Check if MongoDB is running (if using local MongoDB)');
        console.error('   2. Verify MONGODB_URI in .env file is correct');
        console.error('   3. Check network connectivity (if using MongoDB Atlas)');
        console.error('   4. Verify IP whitelist in MongoDB Atlas (if using Atlas)');
        console.error('   5. Check if DNS resolution is working');
        
        // In development, allow server to start without DB (for testing API endpoints)
        if (process.env.NODE_ENV === 'development' && process.env.ALLOW_NO_DB === 'true') {
          console.warn('⚠️  Starting server without database connection (ALLOW_NO_DB=true)');
          console.warn('⚠️  Auth and data features will not work!');
          return;
        }
        
        console.error('❌ Server cannot start without database connection');
        throw new Error(`Failed to connect to MongoDB after ${retries} attempts: ${error.message}`);
      }
    }
  }
};

module.exports = connectDB;
module.exports.isDbConnected = isDbConnected;
module.exports.ensureConnected = ensureConnected;

