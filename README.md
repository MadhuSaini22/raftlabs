# Table & Co. Order Management

A React/Vite food-ordering client with an Express, MongoDB, and Socket.IO API. Customers browse a database-backed menu, manage cart quantities, validate checkout details, place orders, and track multiple saved orders. Menu prices and persisted order totals are always calculated by the server.

## Architecture

- `client/src/features` contains cart, menu, and order UI/state by feature; `client/src/lib` owns Axios, Socket.IO, and TanStack Query setup.
- Client order constants and formatting helpers are grouped in `client/src/constants` and `client/src/utils`.
- `server/src/routes → controllers → services → repositories` separates HTTP handling, business rules, and Mongoose access.
- The server owns lifecycle transitions and persists changes before publishing Socket.IO events.

## Setup

Install each workspace separately:

```sh
cd server
npm install

cd ../client
npm install
```

Create `server/.env` from `server/.env.example` and set placeholders appropriate for your environment:

```dotenv
MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/table-co
PORT=8000
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me
```

The example values are development placeholders only. Credentials are validated on the server; `/admin/login` receives an httpOnly session cookie, never a browser-stored admin token. For a cross-origin HTTPS deployment, set `CLIENT_URL` to the exact frontend origin so CORS permits credentials and the session cookie uses `SameSite=None; Secure`.

Run the API from either the repository root (`npm --prefix server run dev`) or `server` (`npm run dev`). The entry point explicitly loads `server/.env`. Run the client with `npm run dev` from `client`.

## Ordering and lifecycle

Customers can add/remove menu items, adjust quantities, and check out with name, phone number, and delivery address validation. The server receives only menu IDs and quantities, snapshots database prices, and calculates the authoritative total.

Order progression is server-controlled:

`Received → Preparing → Out for Delivery → Delivered`

`PATCH /api/v1/orders/:id/status` advances exactly one valid step; the client does not choose the next status. Delivered and cancelled orders are terminal. Authenticated admins can cancel eligible orders with a validated reason; cancellation persists the `CANCELLED` status, reason, and timestamp.

## Admin

Admin login, session checks, and logout use a server-controlled httpOnly cookie. Admin order listing, status advancement, cancellation, and admin realtime order-created events require an authenticated admin session; these APIs/events are not exposed to unauthenticated clients.

## Customer tracking and realtime

Each newly created order receives a server-generated 256-bit tracking token. The client stores the order ID with its token in local storage, so Track Order opens a local history rather than only the latest order. Customers can select and inspect each order independently; delivered and cancelled orders remain in that history.

`GET /api/v1/orders/:id` and the Socket.IO order subscription require the matching tracking token. Knowing an order ID alone does not disclose customer details. This is per-order tracking protection, not full customer authentication.

Socket.IO sends status and cancellation updates only to the corresponding order room. The client updates only the matching tracked order, while authenticated admins receive new-order events in a separate admin room. There is no polling.

## API overview

- `GET /api/v1/menu` — available menu items.
- `POST /api/v1/orders` — creates an order and returns its server-generated tracking token.
- `GET /api/v1/orders/:id` — retrieves a tracked order with `X-Order-Tracking-Token`.
- `POST /api/v1/admin/auth/login`, `POST /logout`, `GET /session` — admin session flow.
- `GET /api/v1/admin/orders`, `PATCH /api/v1/orders/:id/status`, and `PATCH /api/v1/orders/:id/cancel` — authenticated admin operations.

## Limitations

- Admin sessions are in-memory and therefore end on a server restart; durable shared session storage would be needed for a multi-instance deployment.
- Customer access is intentionally per-order-token based rather than a full customer account/authentication system.

## Verification

```sh
cd client
npm test
npm run build
npm run lint

cd ../server
npm test
npm run build

cd ..
git diff --check
```
