const request = require('supertest');
const { sequelize } = require('../src/config/database');
const Task = require('../src/models/Task');

let app;

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  app = require('../src/app');

  await new Promise((resolve) => setTimeout(resolve, 500));
});

afterAll(async () => {
  await Task.destroy({ where: {}, truncate: true });
  await sequelize.close();

  await new Promise((resolve) => setTimeout(resolve, 500));
});

beforeEach(async () => {
  await Task.destroy({ where: {}, truncate: true });
});

describe('Task API Tests', () => {
  test('GET /api/tasks - should return empty array initially', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('POST /api/tasks - should create a new task', async () => {
    const res = await request(app).post('/api/tasks').send({
      title: 'Test Task',
      description: 'Test Description',
      status: 'pending',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Test Task');
    expect(res.body.description).toBe('Test Description');
    expect(res.body.status).toBe('pending');
  });

  test('POST /api/tasks - should fail without title', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ description: 'No title' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/tasks/:id - should return a task', async () => {
    const createRes = await request(app).post('/api/tasks').send({
      title: 'Get Test Task',
      description: 'Testing GET endpoint',
    });

    expect(createRes.status).toBe(201);
    const createdTaskId = createRes.body.id;

    const res = await request(app).get(`/api/tasks/${createdTaskId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdTaskId);
    expect(res.body.title).toBe('Get Test Task');
  });

  test('GET /api/tasks/:id - should return 404 for non-existent task', async () => {
    const fakeId = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(app).get(`/api/tasks/${fakeId}`);
    expect(res.status).toBe(404);
  });

  test('PATCH /api/tasks/:id - should update task status', async () => {
    const createRes = await request(app).post('/api/tasks').send({
      title: 'Update Test Task',
      status: 'pending',
    });

    expect(createRes.status).toBe(201);
    const createdTaskId = createRes.body.id;

    const res = await request(app)
      .patch(`/api/tasks/${createdTaskId}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.id).toBe(createdTaskId);
  });

  test('PATCH /api/tasks/:id - should update task title and description', async () => {
    const createRes = await request(app).post('/api/tasks').send({
      title: 'Original Title',
      description: 'Original Description',
    });

    const createdTaskId = createRes.body.id;

    const res = await request(app).patch(`/api/tasks/${createdTaskId}`).send({
      title: 'Updated Title',
      description: 'Updated Description',
    });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.description).toBe('Updated Description');
  });

  test('PATCH /api/tasks/:id - should reject invalid status', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .send({ title: 'Test Task' });

    const createdTaskId = createRes.body.id;

    const res = await request(app)
      .patch(`/api/tasks/${createdTaskId}`)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
  });

  test('DELETE /api/tasks/:id - should delete a task', async () => {
    const createRes = await request(app).post('/api/tasks').send({
      title: 'Delete Test Task',
      description: 'This will be deleted',
    });

    expect(createRes.status).toBe(201);
    const createdTaskId = createRes.body.id;

    const res = await request(app).delete(`/api/tasks/${createdTaskId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    const checkRes = await request(app).get(`/api/tasks/${createdTaskId}`);
    expect(checkRes.status).toBe(404);
  });

  test('DELETE /api/tasks/:id - should return 404 for non-existent task', async () => {
    const fakeId = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(app).delete(`/api/tasks/${fakeId}`);
    expect(res.status).toBe(404);
  });

  test('GET /api/tasks - should return all tasks', async () => {
    await request(app)
      .post('/api/tasks')
      .send({ title: 'Task 1', status: 'pending' });

    await request(app)
      .post('/api/tasks')
      .send({ title: 'Task 2', status: 'completed' });

    await request(app)
      .post('/api/tasks')
      .send({ title: 'Task 3', status: 'pending' });

    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
  });
});
