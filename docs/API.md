# A2SV E‑commerce Platform — API Documentation

This document describes the REST API provided by the A2SV_ecommercePlatform project. It is intended to help developers understand the endpoints, request/response formats, models, environment variables, and known issues.

## Quick overview
- Tech: Node.js (ES modules), Express, Mongoose, JWT for auth
- Entry point: `index.js` (listens on port 3000 by default)
- Main responsibilities:
  - user authentication (register/login)
  - product management (CRUD)
  - order placement and retrieval

Base URL (local): `http://localhost:3000`

## Setup / Run

1. Install dependencies

```powershell
npm install
```

2. Create a `.env` file in project root. Required variables (example):

```properties
MONGO='mongodb+srv://<user>:<password>@cluster0.example.mongodb.net/<db>?retryWrites=true&w=majority'
JWT_SECRET="your_jwt_secret"
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10
```

3. Start the server (development):

```powershell
npm run dev
```

Notes:
- Do not commit real credentials to the repository. Add `.env` to `.gitignore` and keep an example in `.env.example`.

## Authentication

- JWT is used. After successful login, the API returns a token.
- Include the header on protected routes:

```
Authorization: Bearer <token>
```

Token payload (example):

```json
{
  "userId": "<mongo ObjectId>",
  "username": "alice",
  "role": "User" // or "Admin"
}
```

## Response format

Every API response follows the JSON envelope used across the project:

Success example:

```json
{
  "success": true,
  "message": "OK",
  "object": { /* payload */ },
  "errors": null
}
```

Failure example (validation):

```json
{
  "success": false,
  "message": "Validation error",
  "object": null,
  "errors": ["email must be valid"]
}
```

Note: There is a known bug in `utils/response.js` where the `fail` helper references the wrong variable name; see Known issues below.

## Models (Mongoose)

- User (`models/user.js`)
  - id: string (uuid, API-friendly id)
  - username: string (unique)
  - email: string (unique)
  - password: string (hashed)
  - role: string ("User" | "Admin")
  - timestamps: createdAt, updatedAt

- Product (`models/product.js`)
  - id: string (uuid)
  - name: string (unique)
  - description: string
  - price: number
  - stock: number
  - category: string
  - userId: ObjectId (ref `User`) — the creator
  - timestamps

- Order (`models/order.js`)
  - id: string (uuid)
  - description: string
  - totalPrice: number
  - status: enum ["Pending","Paid","Shipped","Delivered","Cancelled"]
  - userId: ObjectId (ref `User`)
  - products: array of ObjectId (ref `Product`)
  - timestamps

Note: controller code expects `orderItems` (array of { productId, quantity, priceAtPurchase }) when creating and returning orders — see Known issues.

## Routes / Endpoints

### Auth

- POST /auth/register
  - Description: register a new user
  - Body (JSON):
    - username: string (alphanumeric)
    - email: string (valid email)
    - password: string (min 8 chars, include upper/lower/number/special)
  - Success: 201 Created
    - object: { id, username, email, createdAt }
  - Errors: 400 validation errors, 500 server errors

- POST /auth/login
  - Description: obtain JWT
  - Body (JSON):
    - email: string
    - password: string
  - Success: 200 OK
    - object: { token }
  - Errors: 400 validation, 401 invalid credentials

### Products

- GET /products
  - Query params:
    - page (default 1)
    - limit (default 10)
    - search (optional; partial name match)
  - Success: 200
    - object: array of product summaries (id, name, price, stock, category)
    - pagination: currentPage, pageSize, totalPages, totalProducts

- GET /products/:id
  - Success: 200
    - object: full product
  - Errors: 404 if not found

- POST /products (Admin only)
  - Headers: Authorization: Bearer <token>
  - Body (JSON): name, description, price (number), stock (int), category
  - Success: 201 Created — returns created product
  - Errors: 400 validation, 401/403 auth/role errors

- PUT /products/:id (Admin only)
  - Body: partial fields to update
  - Success: 200 updated product

- DELETE /products/:id (Admin only)
  - Success: 200 with a success message

### Orders

- POST /orders (authenticated)
  - Headers: Authorization: Bearer <token>
  - Body (JSON): array of items, e.g.
    ```json
    [ { "productId": "<id>", "quantity": 2 }, ... ]
    ```
  - Behavior: the server will check stock, decrement stock in a transaction, and create an order record.
  - Success: 201 Created
    - object: { order_id, status, total_price, orderItems, createdAt }
  - Errors: 400 validation/insufficient stock, 404 product not found

- GET /orders (authenticated)
  - Returns current user's orders (array)

## Middleware

- `middleware/auth.js` — verifies Bearer JWT, sets `req.user`.
- `middleware/role.js` — checks `req.user.role` equals required role (used for Admin-only product endpoints).

## Error handling

- Global error handler in `index.js` logs the error and responds with 500:

```json
{ "success": false, "message": "Internal server error" }
```

- Use `utils/response.js` helpers `success(res, ...)` and `fail(res, ...)` (intended to provide the envelope shown above).

## Known issues / TODOs (actionable items for contributors)

1. `utils/response.js` — bug in `fail` helper: the function parameter is named `error` but the implementation references `errors`. This causes a ReferenceError when `fail` is used and will result in 500 responses. Fix: rename parameter to `errors` or use the correct variable inside the function.

2. `controllers/productController.js` — the listing function uses a `cache` variable (NodeCache) but `cache` is not instantiated (no `const cache = new NodeCache()`). This will throw at runtime. Either instantiate cache or remove the caching code.

3. Orders schema vs controller mismatch — controller creates and expects `orderItems` while `models/order.js` stores `products` array. Align the model and controller; add an `orderItems` field (with `orderItemSchema`) to the `Order` model.

4. Sensitive data in `.env` (example project currently contains a Mongo credential). Rotate credentials and add `.env` to `.gitignore`.

5. Some files (`utils/error.js`, `utils/verifyUser.js`) are empty or missing; decide whether to remove imports or implement intended helpers.

6. Add tests (project has `jest` and `supertest` in `package.json` but no test suites). Consider adding integration tests for auth/register/login and order flow using `mongodb-memory-server`.

## Contribution / Extension notes

- When adding endpoints, follow the existing response envelope and use `success`/`fail` helpers.
- Keep environment variables centralized in `.env` and document new required keys in this file.
- Use mongoose transactions for multi-document operations that must be atomic (placeOrder already uses sessions).

## Quick examples

- Register (curl)

```powershell
curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d '{"username":"testuser","email":"test@example.com","password":"P@ssw0rd1!"}'
```

- Login -> get token, then create product (Admin):

```powershell
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"AdminPass1!"}'

# then use token in Authorization header for protected endpoints
curl -X POST http://localhost:3000/products -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"name":"Widget","description":"A widget","price":9.99,"stock":100,"category":"gadgets"}'
```

## Where I put this doc
- `docs/API.md` (this file)

If you want, I can also:
- open PR that fixes the `fail` helper and the `cache` instantiation, and add a `.env.example` and `.gitignore` entry (small, low-risk changes);
- or generate a Postman collection / OpenAPI (swagger) file from this documentation.

---

If you'd like an OpenAPI spec or a Postman collection created from this doc, tell me which format you prefer and I will generate it next.
