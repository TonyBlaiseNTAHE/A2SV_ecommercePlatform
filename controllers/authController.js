import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { success, fail } from "../utils/response.js";
import validator from "validator";

/**
 * authController: this controller is for signing-up and login up a user
 */

const Pass_Reg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const regx = /^[A-Za-z0-9]+$/;

export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    console.log("Received body:", req.body);

    if (!username || !regx.test(username)) {
      return fail(res, 400, "Validation error", [
        "username must be alphanumeric and provided",
      ]);
    }
    if (!email || !validator.isEmail(email))
      return fail(res, 400, "Validation error", ["email must be valid"]);
    if (!password || !Pass_Reg.test(password))
      return fail(res, 400, "Validator error", [
        "password must be at least 8 chars, include upper, lower, number and special char",
      ]);

    const existingEmail = await User.findOne({ email });
    if (existingEmail)
      return fail(res, 400, "Validation error", ["email already registered"]);
    const existingUsername = await User.findOne({ username });

    if (existingUsername) {
      return fail(res, 400, "Validation error", ["username already taken"]);
    }
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);
    const hashed = await bcrypt.hash(password, saltRounds);

    const user = new User({ username, email, password: hashed });
    await user.save();

    return success(res, 201, "User registered", {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !validator.isEmail(email))
      return fail(res, 400, "Validation error", ["email must be valid"]);
    if (!password)
      return fail(res, 400, "Validation error", ["password is required"]);
    const user = await User.findOne({ email });
    if (!user)
      return fail(res, 401, "Invalid credentials", ["invalid credentials"]);

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return fail(res, 401, "Invalid credentials", ["invalid credentials"]);

    const payload = {
      userId: user._id,
      username: user.username,
      role: user.role || "User",
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    });

    return success(res, 200, "Login successful", { token });
  } catch (err) {
    next(err);
  }
};
