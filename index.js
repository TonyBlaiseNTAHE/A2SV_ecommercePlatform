import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/product.js";
import orderRoutes from "./routes/order.js";

dotenv.config();

mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log("Connect to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });

const app = express();

app.use(cors());
app.use(express.json({ limit: "50kb" }));

app.get("/", (req, res) =>
  res.json({
    success: true,
    message: "E-commerce API is working",
    object: null,
    errors: null,
  })
);

app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Export app for testing (don't listen when running tests)
if (process.env.NODE_ENV !== "test") {
  app.listen(3000, () => {
    console.log("Server listening on port 3000");
  });
}

export default app;
