import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import User from '../models/user.js';

let app;
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongod.getUri();
  process.env.MONGO = uri;
  process.env.NODE_ENV = 'test';
  const imported = await import('../index.js');
  app = imported.default;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('Products endpoints', () => {
  let adminToken;
  beforeAll(async () => {
    // create admin user
    await request(app).post('/auth/register').send({
      username: 'admin',
      email: 'admin@example.com',
      password: 'AdminP@ss1!'
    });
    // promote to admin directly via mongoose
    const u = await User.findOne({ email: 'admin@example.com' });
    u.role = 'Admin';
    await u.save();

    const res = await request(app).post('/auth/login').send({
      email: 'admin@example.com',
      password: 'AdminP@ss1!'
    });
    adminToken = res.body.object.token;
  });

  it('should create a product (admin)', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Widget', description: 'A useful widget for testing', price: 9.99, stock: 100, category: 'gadgets' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.object).toHaveProperty('name', 'Widget');
  });

  it('should list products', async () => {
    const res = await request(app).get('/products');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.object)).toBe(true);
  });
});
