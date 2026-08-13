# Table & Co. Order Management

A full-stack food ordering assessment. Customers browse a MongoDB-backed menu, manage cart quantities, validate checkout details, and track saved orders. The server calculates menu prices and order totals authoritatively.

## Stack and architecture

- Client: React, Vite, TypeScript, TanStack Query, Axios, Socket.IO client, React Hook Form and Zod.
- Server: Express, TypeScript, Mongoose/MongoDB, Socket.IO and Zod.
- Server flow: `routes → controllers → services → repositories`; client UI is organized by feature.

## Local setup

MongoDB is required. Create `server/.env` from `server/.env.example`, then supply your own values:

```dotenv
MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/table-co
PORT=8000
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me
```

The API loads `server/.env`; never commit real credentials. Start the backend:

```sh
cd server
npm install
npm run dev
```

In a second terminal, create `client/.env` if the API is not local:

```dotenv
VITE_API_URL=http://localhost:8000/api/v1
```

Then start the client:

```sh
cd client
npm install
npm run dev
```

## Ordering, tracking, and admin

Checkout sends only menu IDs, quantities, and customer details. Each request carries an idempotency key, so retries resolve to the original persisted order instead of creating a duplicate. Orders progress server-side: `Received → Preparing → Out for Delivery → Delivered`; delivered and cancelled orders are terminal.

Each order receives a server-generated 256-bit tracking token. The client stores an order ID/token pair locally, so multiple orders remain independently trackable. Customer retrieval and Socket.IO subscriptions require that token; this is per-order tracking, not a customer-account system.

The admin portal is at `/admin/login`. It uses an httpOnly session cookie; protected admin APIs support paginated, status-filtered order listing, advancing an order, and cancellation with a reason and timestamp. Login attempts are process-local rate limited (suitable for this single-instance assessment, not a shared multi-instance limiter). Admin sessions are in memory and end after a server restart.

## Deployment

- Frontend: https://raftlabs-lovat.vercel.app
- Backend: https://raftlabs-server-qwde.onrender.com

For cross-origin HTTPS deployment, set `CLIENT_URL` to the exact frontend URL so credentialed CORS and secure httpOnly cookies work. Build and run the server on Render with `npm run build` and `npm start` from the `server` root.

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
