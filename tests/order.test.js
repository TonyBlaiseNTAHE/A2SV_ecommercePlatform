import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import User from "../models/user.js";
import Product from "../models/product.js";

let app;
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongod.getUri();
  process.env.MONGO = uri;
  process.env.NODE_ENV = "test";
  const imported = await import("../index.js");
  app = imported.default;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe("Orders endpoints", () => {
  let userToken;
  let productId;

  beforeAll(async () => {
    await request(app).post("/auth/register").send({
      username: "buyer",
      email: "buyer@example.com",
      password: "BuyerP@ss1!",
    });

    const res = await request(app).post("/auth/login").send({
      email: "buyer@example.com",
      password: "BuyerP@ss1!",
    });
    userToken = res.body.object.token;

    await request(app).post("/auth/register").send({
      username: "admin2",
      email: "admin2@example.com",
      password: "AdminP@ss1!",
    });
    const admin = await User.findOne({ email: "admin2@example.com" });
    admin.role = "Admin";
    await admin.save();
    const loginAdmin = await request(app)
      .post("/auth/login")
      .send({ email: "admin2@example.com", password: "AdminP@ss1!" });
    const adminToken = loginAdmin.body.object.token;

    const prodRes = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Orderable",
        description: "For orders",
        price: 5.0,
        stock: 10,
        category: "test",
      });

    productId = prodRes.body.object._id || prodRes.body.object.id;
  });

  it("should place an order and decrement stock", async () => {
    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send([{ productId, quantity: 2 }]);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("success", true);

    const prod = await Product.findById(productId);
    expect(prod.stock).toBe(8);
  });
});
