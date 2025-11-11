import mongoose from "mongoose";
import Product from "../models/product.js";
import Order from "../models/order.js";
import { success, fail } from "../utils/response.js";

/**
 *
 * @param {request} req
 * @param {response get from the request} res
 * @param {middleware for handeling the errors} next
 * @returns
 */

export const placeOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return fail(res, 400, "Validation error", [
        "order must be a non-empty array",
      ]);

    for (const it of items) {
      if (!it.productId || !it.quantity || it.quantity <= 0)
        return fail(res, 400, "Validation error", [
          "each item must have productId and quantity>0",
        ]);
    }

    const userId = req.user.userId;

    session.startTransaction();

    let total = 0;
    const orderItems = [];

    for (const it of items) {
      const product = await Product.findById(it.productId).session(session);
      if (!product) {
        await session.abortTransaction();
        return fail(res, 404, "Product not found", [
          `product ${it.productId} not found`,
        ]);
      }
      if (product.stock < it.quantity) {
        await session.abortTransaction();
        return fail(res, 400, "Insufficient stock", [
          `Insufficient stock for ${product.name}`,
        ]);
      }

      product.stock = product.stock - it.quantity;
      await product.save({ session });

      const priceAtPurchase = product.price;
      total += priceAtPurchase * it.quantity;
      orderItems.push({
        productId: product._id,
        quantity: it.quantity,
        priceAtPurchase,
      });
    }

    const order = new Order({
      description: `Order by ${userId}`,
      totalPrice: total,
      userId,
      orderItems,
      status: "Pending",
    });

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    return success(res, 201, "Order placed", {
      order_id: order.id,
      status: order.status,
      total_price: order.totalPrice,
      orderItems: order.orderItems,
      createdAt: order.createdAt,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

export const myOrders = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const orders = await Order.find({ userId })
      .select("id status totalPrice createdAt orderItems")
      .sort({ createdAt: -1 })
      .lean();
    return success(res, 200, "Orders fetched", orders);
  } catch (err) {
    next(err);
  }
};
