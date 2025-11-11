import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let app;
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongod.getUri();
  process.env.MONGO = uri;
  process.env.NODE_ENV = 'test';
  // import app after setting env so index.js connects to in-memory mongo
  const imported = await import('../index.js');
  app = imported.default;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('Auth endpoints', () => {
  it('should register a new user', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'P@ssw0rd1!'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.object).toHaveProperty('username', 'testuser');
  });

  it('should not register duplicate email', async () => {
    // register first
    await request(app).post('/auth/register').send({
      username: 'another',
      email: 'dup@example.com',
      password: 'P@ssw0rd1!'
    });

    const res = await request(app).post('/auth/register').send({
      username: 'another2',
      email: 'dup@example.com',
      password: 'P@ssw0rd1!'
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
  });

  it('should login with correct credentials', async () => {
    const email = 'login@example.com';
    const password = 'P@ssw0rd1!';
    await request(app).post('/auth/register').send({
      username: 'loginuser',
      email,
      password
    });

    const res = await request(app).post('/auth/login').send({
      email,
      password
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.object).toHaveProperty('token');
  });
});
