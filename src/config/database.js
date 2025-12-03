const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({
  path:
    process.env.NODE_ENV === 'test'
      ? path.resolve(__dirname, '../../.env.test')
      : path.resolve(__dirname, '../../.env'),
});

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'test' ? false : console.log,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully');

    if (process.env.NODE_ENV === 'test') {
      await sequelize.sync({ force: true });
      console.log('Test database synchronized (force)');
    } else {
      await sequelize.sync({ alter: false });
      console.log('Database synchronized');
    }
  } catch (error) {
    console.error('Database connection failed:', error.message);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = { sequelize, connectDB };
