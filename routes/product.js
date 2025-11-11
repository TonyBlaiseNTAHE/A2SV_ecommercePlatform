import express from "express";
import * as productCtrl from "../controllers/productController.js";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/role.js";

/**
 * routes for creating, getting, deleting and updating products
 */

const router = express.Router();

router.get("/", productCtrl.listProducts);
router.get("/:id", productCtrl.getProduct);

router.post("/", auth, requireRole("Admin"), productCtrl.createProduct);
router.put("/:id", auth, requireRole("Admin"), productCtrl.updateProduct);
router.delete("/:id", auth, requireRole("Admin"), productCtrl.deleteProduct);

export default router;
