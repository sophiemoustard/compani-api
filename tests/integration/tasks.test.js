const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const { getToken } = require('./seed/usersSeed');
const { populateTasks, tasksList } = require('./seed/tasksSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('TASK ROUTES', () => {
  let token = null;
  beforeEach(populateTasks);
  beforeEach(async () => {
    token = await getToken();
  });
  describe('POST /tasks', () => {
    it('should create a task', async () => {
      const payload = {
        name: 'Tache tictactoe',
        isDone: true,
      };
      const result = await app.inject({
        method: 'POST',
        url: '/tasks',
        payload,
        headers: { 'x-access-token': token },
      });

      expect(result.statusCode).toEqual(200);
      expect(result.result.data.task).toBeDefined();
      expect(result.result.data.task.name).toEqual(payload.name);
    });
    it('should return a 400 error as payload is invalid', async () => {
      const payload = { isDone: true };
      const result = await app.inject({
        method: 'POST',
        url: '/tasks',
        payload,
        headers: { 'x-access-token': token },
      });

      expect(result.statusCode).toEqual(400);
    });
  });

  describe('GET /tasks', () => {
    it('should return all tasks', async () => {
      const result = await app.inject({
        method: 'GET',
        url: '/tasks',
        headers: { 'x-access-token': token },
      });

      expect(result.statusCode).toBe(200);
      expect(result.result.data.tasks).toBeDefined();
      expect(result.result.data.tasks.length).toEqual(tasksList.length);
    });
    it('should return a 404 error if no task is returned', async () => {
      const result = await app.inject({
        method: 'GET',
        url: '/tasks?name=lalala',
        headers: { 'x-access-token': token },
      });

      expect(result.statusCode).toBe(404);
    });
    it('should return a 400 error if query is invalid', async () => {
      const result = await app.inject({
        method: 'GET',
        url: '/tasks?invalid=lalala',
        headers: { 'x-access-token': token },
      });

      expect(result.statusCode).toBe(400);
    });
  });

  describe('GET /tasks/{_id}', () => {
    it('should return task', async () => {
      const task = tasksList[0];
      const result = await app.inject({
        method: 'GET',
        url: `/tasks/${task._id}`,
        headers: { 'x-access-token': token },
      });

      expect(result.statusCode).toBe(200);
      expect(result.result.data.task).toBeDefined();
      expect(result.result.data.task._id).toEqual(task._id);
    });
    it('should reutrn a 404 error if task does not exist', async () => {
      const invalidId = new ObjectID().toHexString();
      const result = await app.inject({
        method: 'GET',
        url: `/tasks/${invalidId}`,
        headers: { 'x-access-token': token },
      });

      expect(result.statusCode).toBe(404);
    });
    it('should return a 400 error if id is not valid', async () => {
      const result = await app.inject({
        method: 'GET',
        url: '/tasks/1234',
        headers: { 'x-access-token': token },
      });

      expect(result.statusCode).toBe(400);
    });
  });

  describe('PUT /tasks/{_id}', () => {
    it('should update task', async () => {
      const task = tasksList[0];
      const payload = { name: 'Nouvelle tâche' };
      const result = await app.inject({
        method: 'PUT',
        url: `/tasks/${task._id}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(result.statusCode).toEqual(200);
      expect(result.result.data.task).toBeDefined();
      expect(result.result.data.task._id).toEqual(task._id);
      expect(result.result.data.task.name).toEqual(payload.name);
    });
    it('should return a 400 error as payload is invalid', async () => {
      const task = tasksList[0];
      const payload = { invalid: 'Nouvelle tâche' };
      const result = await app.inject({
        method: 'PUT',
        url: `/tasks/${task._id}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(result.statusCode).toEqual(400);
    });
    it('should return a 400 error as id is invalid', async () => {
      const payload = { name: 'Nouvelle tâche' };
      const result = await app.inject({
        method: 'PUT',
        url: '/tasks/12345678',
        headers: { 'x-access-token': token },
        payload,
      });

      expect(result.statusCode).toEqual(400);
    });
    it('should return a 404 error as task does not exist', async () => {
      const invalidId = new ObjectID().toHexString();
      const payload = { name: 'Nouvelle tâche' };
      const result = await app.inject({
        method: 'PUT',
        url: `/tasks/${invalidId}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(result.statusCode).toEqual(404);
    });
  });

  describe('DELETE /tasks/{_id}', () => {
    it('should delete task', async () => {
      const task = tasksList[0];

      const result = await app.inject({
        method: 'DELETE',
        url: `/tasks/${task._id}`,
        headers: { 'x-access-token': token },
      });

      expect(result.statusCode).toEqual(200);
    });
    it('should return a 400 error as id is invalid', async () => {
      const payload = { name: 'Nouvelle tâche' };
      const result = await app.inject({
        method: 'DELETE',
        url: '/tasks/12345678',
        headers: { 'x-access-token': token },
        payload,
      });

      expect(result.statusCode).toEqual(400);
    });
    it('should return a 404 error as task does not exist', async () => {
      const invalidId = new ObjectID().toHexString();
      const payload = { name: 'Nouvelle tâche' };
      const result = await app.inject({
        method: 'DELETE',
        url: `/tasks/${invalidId}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(result.statusCode).toEqual(404);
    });
  });
});
