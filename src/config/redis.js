const redis = require('redis');
require('dotenv').config();

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis connected successfully'));

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Redis connection failed:', error.message);
  }
};

module.exports = { redisClient, connectRedis };
