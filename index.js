const connectDB = require('./src/config/db');
const app = require('./src/app');

module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: err.message,
    });
  }
};
