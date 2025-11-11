import { fail } from "../utils/response.js";

export default function rateLimit(options = {}) {
  const windowMs = parseInt(
    process.env.RATE_LIMIT_WINDOW_MS ||
      String(options.windowMs || 15 * 60 * 1000),
    10
  );
  const max = parseInt(
    process.env.RATE_LIMIT_MAX || String(options.max || 100),
    10
  );

  const hits = new Map();

  return (req, res, next) => {
    try {
      const identifier = req.ip || req.connection.remoteAddress || "unknown";
      const now = Date.now();
      const windowStart = now - windowMs;
      const arr = hits.get(identifier) || [];
      while (arr.length && arr[0] <= windowStart) arr.shift();

      if (arr.length >= max) {
        res.setHeader("Retry-After", Math.ceil(windowMs / 1000));
        return fail(res, 429, "Too many requests", ["Rate limit exceeded"]);
      }

      arr.push(now);
      hits.set(identifier, arr);

      if (hits.size > 10000) {
        for (const [key, val] of hits.entries()) {
          if (val.length === 0 || val[val.length - 1] <= windowStart)
            hits.delete(key);
        }
      }

      next();
    } catch (err) {
      console.error("Rate limiter error:", err);
      next();
    }
  };
}
