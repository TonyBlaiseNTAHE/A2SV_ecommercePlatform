import { fail } from "../utils/response.js";

export default function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return fail(res, 401, "Unauthorized", ["No user"]);
    if (req.user.role !== role)
      return fail(res, 403, "Forbidden", ["insufficient permissions"]);
    next();
  };
}
