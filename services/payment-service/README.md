Payment Service - local run & env

Required environment variables (defaults shown):

- PORT (5003)
- MONGO_URI (mongodb://mongodb:27017/payment_service)
- ORDER_SERVICE_URL (http://localhost:3010)
- INTERNAL_SERVICE_SECRET (change-me)
- ADMIN_SECRET (change-me-admin)
- MAX_RETRIES (5)
- BACKOFF_BASE_MS (500)
- OUTBOX_POLL_INTERVAL (5000)

Admin endpoints are protected by `x-admin-secret` header. Internal callbacks require `x-internal-secret`.

Quick test scripts:

- `node scripts/test-outbox.js --ok` => simulates successful delivery, outbox should be SENT
- `node scripts/test-outbox.js` => simulates failing delivery, outbox should be retried/failed

Metrics: GET /metrics
Health: GET /health
Admin: GET /admin/outbox (x-admin-secret required)
