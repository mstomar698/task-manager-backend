const request = require('supertest');
const { sequelize } = require('../../src/config/database');
const { redisClient } = require('../../src/config/redis');
const Task = require('../../src/models/Task');

let app;

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  app = require('../../src/app');

  await new Promise((resolve) => setTimeout(resolve, 500));
});

afterAll(async () => {
  await Task.destroy({ where: {}, truncate: true });

  if (redisClient.isOpen) {
    await redisClient.flushAll();
    await redisClient.quit();
  }

  await sequelize.close();
  await new Promise((resolve) => setTimeout(resolve, 500));
});

beforeEach(async () => {
  await Task.destroy({ where: {}, truncate: true });

  if (redisClient.isOpen) {
    await redisClient.flushAll();
  }
});

describe('Task API Integration Tests', () => {
  describe('Complete Task Lifecycle', () => {
    test('should handle full CRUD lifecycle for a task', async () => {
      const createRes = await request(app).post('/api/tasks').send({
        title: 'Integration Test Task',
        description: 'Testing full lifecycle',
        status: 'pending',
      });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toHaveProperty('id');
      expect(createRes.body.title).toBe('Integration Test Task');
      const taskId = createRes.body.id;

      const getRes = await request(app).get(`/api/tasks/${taskId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(taskId);
      expect(getRes.body.title).toBe('Integration Test Task');

      const updateRes = await request(app).patch(`/api/tasks/${taskId}`).send({
        title: 'Updated Task Title',
        description: 'Updated description',
        status: 'completed',
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.title).toBe('Updated Task Title');
      expect(updateRes.body.status).toBe('completed');

      const verifyRes = await request(app).get(`/api/tasks/${taskId}`);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.title).toBe('Updated Task Title');
      expect(verifyRes.body.status).toBe('completed');

      const deleteRes = await request(app).delete(`/api/tasks/${taskId}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('Task deleted successfully');

      const finalRes = await request(app).get(`/api/tasks/${taskId}`);
      expect(finalRes.status).toBe(404);
    });
  });

  describe('Multiple Tasks Management', () => {
    test('should create, list, filter, and manage multiple tasks', async () => {
      const tasks = [
        { title: 'Task 1', description: 'First task', status: 'pending' },
        { title: 'Task 2', description: 'Second task', status: 'completed' },
        { title: 'Task 3', description: 'Third task', status: 'pending' },
        { title: 'Task 4', description: 'Fourth task', status: 'completed' },
        { title: 'Task 5', description: 'Fifth task', status: 'pending' },
      ];

      const createdTaskIds = [];

      for (const taskData of tasks) {
        const res = await request(app).post('/api/tasks').send(taskData);
        expect(res.status).toBe(201);
        createdTaskIds.push(res.body.id);
      }

      const allTasksRes = await request(app).get('/api/tasks');
      expect(allTasksRes.status).toBe(200);
      expect(allTasksRes.body.length).toBe(5);

      const timestamps = allTasksRes.body.map((t) =>
        new Date(t.createdAt).getTime()
      );
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }

      const updateRes1 = await request(app)
        .patch(`/api/tasks/${createdTaskIds[0]}`)
        .send({ status: 'completed' });
      expect(updateRes1.status).toBe(200);

      const updateRes2 = await request(app)
        .patch(`/api/tasks/${createdTaskIds[2]}`)
        .send({ title: 'Updated Task 3' });
      expect(updateRes2.status).toBe(200);

      const deleteRes = await request(app).delete(
        `/api/tasks/${createdTaskIds[4]}`
      );
      expect(deleteRes.status).toBe(200);

      const finalRes = await request(app).get('/api/tasks');
      expect(finalRes.status).toBe(200);
      expect(finalRes.body.length).toBe(4);
    });
  });

  describe('Redis Caching Integration', () => {
    test('should cache GET requests and invalidate on mutations', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Cache Test Task' });
      expect(createRes.status).toBe(201);
      const taskId = createRes.body.id;

      const firstGet = await request(app).get('/api/tasks');
      expect(firstGet.status).toBe(200);
      expect(firstGet.body.length).toBe(1);

      if (redisClient.isOpen) {
        const cached = await redisClient.get('tasks:all');
        expect(cached).toBeTruthy();
        const cachedData = JSON.parse(cached);
        expect(cachedData.length).toBe(1);
      }

      const secondGet = await request(app).get('/api/tasks');
      expect(secondGet.status).toBe(200);
      expect(secondGet.body.length).toBe(1);

      await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ status: 'completed' });

      if (redisClient.isOpen) {
        const cachedAfterUpdate = await redisClient.get('tasks:all');
        expect(cachedAfterUpdate).toBeNull();
      }

      const thirdGet = await request(app).get('/api/tasks');
      expect(thirdGet.status).toBe(200);
      expect(thirdGet.body[0].status).toBe('completed');
    });

    test('should invalidate cache on create and delete', async () => {
      await request(app).post('/api/tasks').send({ title: 'Task 1' });

      await request(app).get('/api/tasks');

      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Task 2' });
      const taskId = createRes.body.id;

      if (redisClient.isOpen) {
        const cachedAfterCreate = await redisClient.get('tasks:all');
        expect(cachedAfterCreate).toBeNull();
      }

      const getRes = await request(app).get('/api/tasks');
      expect(getRes.body.length).toBe(2);

      await request(app).delete(`/api/tasks/${taskId}`);

      if (redisClient.isOpen) {
        const cachedAfterDelete = await redisClient.get('tasks:all');
        expect(cachedAfterDelete).toBeNull();
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid UUID formats gracefully', async () => {
      const invalidIds = ['not-a-uuid', '123', 'abc-def-ghi'];

      for (const invalidId of invalidIds) {
        const getRes = await request(app).get(`/api/tasks/${invalidId}`);
        expect(getRes.status).toBe(400);

        const updateRes = await request(app)
          .patch(`/api/tasks/${invalidId}`)
          .send({ title: 'Test' });
        expect(updateRes.status).toBe(400);

        const deleteRes = await request(app).delete(`/api/tasks/${invalidId}`);
        expect(deleteRes.status).toBe(400);
      }
    });

    test('should handle missing required fields', async () => {
      const invalidPayloads = [
        {},
        { title: '' },
        { title: '   ' },
        { description: 'No title provided' },
      ];

      for (const payload of invalidPayloads) {
        const res = await request(app).post('/api/tasks').send(payload);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
      }
    });

    test('should handle invalid status values', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test Task' });
      const taskId = createRes.body.id;

      const invalidStatuses = [
        'invalid',
        'in_progress',
        'done',
        'COMPLETED',
        123,
        true,
      ];

      for (const status of invalidStatuses) {
        const res = await request(app)
          .patch(`/api/tasks/${taskId}`)
          .send({ status });
        expect(res.status).toBe(400);
      }
    });

    test('should handle non-existent task operations', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      const getRes = await request(app).get(`/api/tasks/${fakeId}`);
      expect(getRes.status).toBe(404);

      const updateRes = await request(app)
        .patch(`/api/tasks/${fakeId}`)
        .send({ title: 'Updated' });
      expect(updateRes.status).toBe(404);

      const deleteRes = await request(app).delete(`/api/tasks/${fakeId}`);
      expect(deleteRes.status).toBe(404);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent task creation', async () => {
      const taskPromises = [];

      for (let i = 0; i < 10; i++) {
        taskPromises.push(
          request(app)
            .post('/api/tasks')
            .send({ title: `Concurrent Task ${i}` })
        );
      }

      const results = await Promise.all(taskPromises);

      results.forEach((res) => {
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
      });

      const getAllRes = await request(app).get('/api/tasks');
      expect(getAllRes.status).toBe(200);
      expect(getAllRes.body.length).toBe(10);
    });

    test('should handle concurrent updates to same task', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Concurrent Update Task' });
      const taskId = createRes.body.id;

      const updatePromises = [
        request(app).patch(`/api/tasks/${taskId}`).send({ title: 'Update 1' }),
        request(app).patch(`/api/tasks/${taskId}`).send({ title: 'Update 2' }),
        request(app).patch(`/api/tasks/${taskId}`).send({ title: 'Update 3' }),
      ];

      const results = await Promise.all(updatePromises);

      results.forEach((res) => {
        expect(res.status).toBe(200);
      });

      const getRes = await request(app).get(`/api/tasks/${taskId}`);
      expect(getRes.status).toBe(200);
      expect(['Update 1', 'Update 2', 'Update 3']).toContain(getRes.body.title);
    });
  });

  describe('Data Validation and Constraints', () => {
    test('should enforce title length constraints', async () => {
      const longTitle = 'a'.repeat(256);

      const res = await request(app)
        .post('/api/tasks')
        .send({ title: longTitle });

      expect(res.status).toBe(400);
    });

    test('should handle special characters in title and description', async () => {
      const specialChars = [
        { title: 'Test <script>alert("xss")</script>' },
        { title: 'Test with \'quotes\' and "double quotes"' },
        { title: 'Test with émojis 🎉🚀' },
        { title: 'Test\nwith\nnewlines' },
      ];

      for (const taskData of specialChars) {
        const res = await request(app).post('/api/tasks').send(taskData);
        expect(res.status).toBe(201);
        expect(res.body.title).toBe(taskData.title);
      }
    });

    test('should trim whitespace from title and description', async () => {
      const res = await request(app).post('/api/tasks').send({
        title: '  Trimmed Title  ',
        description: '  Trimmed Description  ',
      });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Trimmed Title');
      expect(res.body.description).toBe('Trimmed Description');
    });
  });

  describe('Task Status Transitions', () => {
    test('should allow status transitions between pending and completed', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Status Test', status: 'pending' });
      const taskId = createRes.body.id;

      const res1 = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ status: 'completed' });
      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('completed');

      const res2 = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ status: 'pending' });
      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('pending');

      for (let i = 0; i < 5; i++) {
        const toggleRes = await request(app)
          .patch(`/api/tasks/${taskId}`)
          .send({ status: i % 2 === 0 ? 'completed' : 'pending' });
        expect(toggleRes.status).toBe(200);
      }
    });
  });

  describe('Batch Operations', () => {
    test('should handle batch creation and retrieval', async () => {
      const batchSize = 50;
      const tasks = Array.from({ length: batchSize }, (_, i) => ({
        title: `Batch Task ${i + 1}`,
        description: `Description for task ${i + 1}`,
        status: i % 2 === 0 ? 'pending' : 'completed',
      }));

      for (const task of tasks) {
        const res = await request(app).post('/api/tasks').send(task);
        expect(res.status).toBe(201);
      }

      const getAllRes = await request(app).get('/api/tasks');
      expect(getAllRes.status).toBe(200);
      expect(getAllRes.body.length).toBe(batchSize);

      const pendingCount = getAllRes.body.filter(
        (t) => t.status === 'pending'
      ).length;
      const completedCount = getAllRes.body.filter(
        (t) => t.status === 'completed'
      ).length;

      expect(pendingCount).toBe(25);
      expect(completedCount).toBe(25);
    });
  });

  describe('API Response Format', () => {
    test('should return consistent response format', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Format Test Task' });

      expect(createRes.body).toHaveProperty('id');
      expect(createRes.body).toHaveProperty('title');
      expect(createRes.body).toHaveProperty('description');
      expect(createRes.body).toHaveProperty('status');
      expect(createRes.body).toHaveProperty('createdAt');
      expect(createRes.body).toHaveProperty('updatedAt');

      expect(typeof createRes.body.id).toBe('string');
      expect(typeof createRes.body.title).toBe('string');
      expect(typeof createRes.body.createdAt).toBe('string');
      expect(['pending', 'completed']).toContain(createRes.body.status);
    });

    test('should return proper error format', async () => {
      const res = await request(app).post('/api/tasks').send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('OK');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('404 Routes', () => {
    test('should return 404 for non-existent routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });
});
