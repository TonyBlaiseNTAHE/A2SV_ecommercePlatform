import Product from "../models/product.js";
import { success, fail } from "../utils/response.js";
import validator from "validator";
import NodeCache from "node-cache";

export const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock, category } = req.body;
    const errors = [];
    if (!name || name.length < 3 || name.length > 100)
      errors.push("name must be between 3 and 100 chars");
    if (!description || description.length < 10)
      errors.push("description must be at least 10 chars");
    if (typeof price !== "number" || price <= 0)
      errors.push("price must be a number > 0");
    if (!Number.isInteger(stock) || stock < 0)
      errors.push("stock must be an integer >= 0");
    if (errors.length) return fail(res, 400, "Validation error", errors);

    const existing = await Product.findOne({ name });
    if (existing)
      return fail(res, 400, "Validation error", [
        "product name already exists",
      ]);

    const product = new Product({
      name,
      description,
      price,
      stock,
      category,
      userId: req.user.userId,
    });
    await product.save();
    return success(res, 201, "Product created", product);
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const errors = [];
    if (updates.name && (updates.name.length < 3 || updates.name.length > 100))
      errors.push("name must be between 3-100 chars");
    if (updates.description && updates.description.length < 10)
      errors.push("description min 10 chars");
    if (
      updates.price !== undefined &&
      (typeof updates.price !== "number" || updates.price <= 0)
    )
      errors.push("price must be a number > 0");
    if (
      updates.stock !== undefined &&
      (!Number.isInteger(updates.stock) || updates.stock < 0)
    )
      errors.push("stock must be integer >=0");
    if (errors.length) return fail(res, 400, "Validation error", errors);

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!product)
      return fail(res, 404, "Product not found", ["product not found"]);
    return success(res, 200, "Product updated", product);
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const id = req.params.id;
    const product = await Product.findByIdAndDelete(id);
    if (!product)
      return fail(res, 404, "Product not found", ["product not found"]);
    return success(res, 200, "Product deleted successfully", null);
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const id = req.params.id;
    const product = await Product.findById(id).lean();
    if (!product)
      return fail(res, 404, "Product not found", ["product not found"]);
    return success(res, 200, "Product fetched", product);
  } catch (err) {
    next(err);
  }
};

export const listProducts = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    const cacheKey = `products_${page}_${limit}_${search}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        message: "Products fetched (from cache)",
        object: cachedData.products,
        currentPage: cachedData.page,
        pageSize: cachedData.limit,
        totalPages: cachedData.totalPages,
        totalProducts: cachedData.totalProducts,
        errors: null,
      });
    }

    const filter = search ? { name: { $regex: search, $options: "i" } } : {};
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit) || 1;
    const products = await Product.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("id name price stock category")
      .lean();

    const responseData = { products, page, limit, totalPages, totalProducts };
    cache.set(cacheKey, responseData);

    return res.status(200).json({
      success: true,
      message: "Products fetched (from DB)",
      object: products,
      currentPage: page,
      pageSize: limit,
      totalPages,
      totalProducts,
      errors: null,
    });
  } catch (err) {
    next(err);
  }
};
