// src/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const taskRoutes = require('./routes/tasks');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/tasks', taskRoutes);

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const startServer = async () => {
  if (process.env.NODE_ENV !== 'test') {
    await connectDB();
    await connectRedis();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    });
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
