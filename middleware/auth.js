import jwt from "jsonwebtoken";
import { fail } from "../utils/response.js";

export default function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return fail(res, 401, "Unauthorized", ["Missing token"]);
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return fail(res, 401, "Invalid token", [err.message]);
  }
}
