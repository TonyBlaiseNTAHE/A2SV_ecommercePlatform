# A2SV E-commerce Platform

This repository contains a simple e-commerce API built with Node.js, Express, and MongoDB (Mongoose). It was developed as a small full-stack backend with authentication, product management, ordering, and some security enhancements.

## What I added / changed

- API documentation: `docs/API.md` — full description of endpoints, models and usage.
- Rate limiting middleware: `middleware/rateLimit.js` and applied in `index.js`.
  - Global default: 100 requests / 15 minutes per IP.
  - Stricter for auth routes: 10 requests / minute per IP.
  - Note: in-memory implementation (not suitable for multi-instance production). Use Redis for distributed rate limiting.
- Tests: added Jest + Supertest integration tests using `mongodb-memory-server` (replica set) in `tests/`:
  - `tests/auth.test.js`
  - `tests/product.test.js`
  - `tests/order.test.js`
- Test runner configuration: `jest.config.cjs` and a test script in `package.json` that runs Jest with Node's ESM support.
- Small bug fixes and improvements:
  - Fixed the `fail` helper in `utils/response.js` to avoid a ReferenceError.
  - Initialized the in-memory cache used by `controllers/productController.js`.
  - Exported the Express `app` from `index.js` and only start the listener when not running tests.

## Quick start (development)

1. Install dependencies

```powershell
npm install
```

2. Create a `.env` file in the project root with the required environment variables (example):

```properties
MONGO='mongodb+srv://<user>:<password>@cluster0.example.mongodb.net/<db>?retryWrites=true&w=majority'
JWT_SECRET="your_jwt_secret"
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

3. Start the server in development mode

```powershell
npm run dev
```

The server listens on port 3000 by default. Visit `http://localhost:3000/` to confirm the API is running.

## Running tests

The project uses Jest + Supertest and runs tests against an in-memory MongoDB replica set (so transactions work in tests).

```powershell
npm test
```

Notes when running tests:

- The first run may download mongodb-memory-server binaries which can take a little time.
- Tests run with `NODE_ENV=test` and import the exported `app` from `index.js` so the server does not automatically listen on a port.

## Environment variables

- `MONGO` — MongoDB connection string
- `JWT_SECRET` — JWT signing secret
- `JWT_EXPIRES_IN` — token expiry (e.g. `24h`)
- `BCRYPT_SALT_ROUNDS` — bcrypt salt rounds
- `RATE_LIMIT_WINDOW_MS` — rate limiting window in ms (default 900000)
- `RATE_LIMIT_MAX` — max requests per window per IP (default 100)

## Security notes & recommendations

- Do not commit real credentials to the repository. Rotate any credentials that were committed and add `.env` to `.gitignore`.
- The current rate limiter is in-memory and only suitable for single-process setups. For production, use a shared store like Redis (e.g., `rate-limit-redis` or `express-rate-limit` + Redis store) so limits are enforced across instances.
- Consider adding HTTPS, helmet middleware, input sanitization and stricter CORS policies for production.

## Next improvements you may want

- Replace in-memory rate limiter with Redis-backed implementation.
- Add end-to-end tests and CI (GitHub Actions) to run tests on push/PR.
- Add API versioning and OpenAPI/Swagger spec generation.
- Implement missing user controller/routes or clean up unused files.

## Where to find things

- Entry point: `index.js`
- Routes: `routes/` (auth, product, order)
- Controllers: `controllers/`
- Models: `models/`
- Middleware: `middleware/` (auth, role, rateLimit)
- Tests: `tests/`
- API docs: `docs/API.md`
