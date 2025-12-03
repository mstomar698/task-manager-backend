const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { redisClient } = require('../config/redis');

const CACHE_KEY = 'tasks:all';
const CACHE_TTL = 300; // 5 minutes

// Helper function to clear cache
const clearCache = async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.del(CACHE_KEY);
    }
  } catch (error) {
    console.error('Cache clear error:', error.message);
  }
};

// GET all tasks
router.get('/', async (req, res, next) => {
  try {
    // Try to get from cache
    if (redisClient.isOpen) {
      const cached = await redisClient.get(CACHE_KEY);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    // Fetch from database
    const tasks = await Task.findAll({
      order: [['createdAt', 'DESC']]
    });

    // Cache the result
    if (redisClient.isOpen) {
      await redisClient.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(tasks));
    }

    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// GET single task
router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
});

// POST create task
router.post('/', async (req, res, next) => {
  try {
    const { title, description, status } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || '',
      status: status || 'pending'
    });

    await clearCache();
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// PATCH update task
router.patch('/:id', async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { title, description, status } = req.body;
    
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (status !== undefined) {
      if (!['pending', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      task.status = status;
    }

    await task.save();
    await clearCache();
    
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// DELETE task
router.delete('/:id', async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.destroy();
    await clearCache();
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;