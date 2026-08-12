# Table & Co. Order Management

A React/Vite food-ordering client with an Express, MongoDB, and Socket.IO API. Customers browse the database-backed menu, manage a cart, place orders, and track multiple locally saved orders in real time. Admins sign in to manage the order queue and cancellations.

## Architecture

- `client/src/features` contains cart, menu, and order UI/state by feature.
- `client/src/lib` owns Axios, Socket.IO, and TanStack Query setup.
- `server/src/routes → controllers → services → repositories` separates HTTP handling, business rules, and Mongoose access.
- The server owns menu prices and the order lifecycle. It persists an update before emitting Socket.IO events.

## Setup

Install each workspace separately:

```sh
cd server && npm install
cd ../client && npm install
```

Create `server/.env` from `server/.env.example` and set:

```dotenv
MONGODB_URI=mongodb+srv://…/table-co
PORT=8000
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me
```

The example admin values are development placeholders only. Credentials are validated only on the server; login at `/admin/login` receives an httpOnly session cookie, not a browser-stored token.

Run the API from either the repository root (`npm --prefix server run dev`) or `server` directory (`npm run dev`). The entry point explicitly loads `server/.env`, so configuration is independent of the working directory. Run the client with `npm run dev` from `client`.

## API overview

- `GET /api/v1/menu` — available menu items.
- `POST /api/v1/orders` — creates an order from customer details and menu IDs/quantities; the server calculates prices and total.
- `GET /api/v1/orders/:id` — retrieves a tracked order.
- `POST /api/v1/admin/auth/login`, `POST /logout`, `GET /session` — admin session flow.
- `GET /api/v1/admin/orders`, `PATCH /api/v1/orders/:id/status`, and `PATCH /api/v1/orders/:id/cancel` — authenticated admin operations.

The status endpoint advances one server-selected lifecycle step: Received → Preparing → Out for Delivery → Delivered. Cancellation is terminal and records its reason and timestamp.

## Realtime and tracking

Each new order receives a 256-bit tracking token. The client stores the token with its local order ID, and must send it to retrieve or subscribe to that order; IDs alone cannot disclose customer data. The client keeps an ordered, deduplicated local history and retains delivered/cancelled orders. Authenticated admins join a separate admin room and receive newly created orders.

## Verification

```sh
cd client && npm test && npm run build && npm run lint
cd ../server && npm test && npm run build
git diff --check
```
