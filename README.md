# Table & Co. Order Management

A deliberately scoped food-delivery ordering feature built around a React/Vite client and an Express/MongoDB API.

## Run locally

1. Start MongoDB and set `MONGODB_URI` if it is not running at the default local URL.
2. In `server`, run `npm install && npm run dev`.
3. In `client`, run `npm install && npm run dev`.

The API is versioned under `/api/v1`: menu retrieval, order creation/retrieval/deletion, and guarded status updates. Order prices are captured at purchase time; the server calculates totals from menu prices and only permits forward status transitions.
