import express from "express";
import { placeOrder, myOrders } from "../controllers/orderController.js";
import auth from "../middleware/auth.js";

/**
 * routes for creating and getting the Orders
 */

const router = express.Router();

router.post("/", auth, placeOrder);
router.get("/", auth, myOrders);

export default router;
