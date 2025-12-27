I focused most on Performance and Stability because a slow or broken app loses customers instantly.

Speed (1M+ Products): I used cursor pagination and Redis caching so the app stays incredibly fast (under 200ms) even with millions of items. Regular pagination gets slow with lots of data, but cursor pagination stays fast forever.

Smart Authentication: I built the OAuth system to cache tokens and prevent duplicate requests. This stops the app from crashing or getting blocked if thousands of users fetch data at the same time.

Reliability: I added retries for failed API calls and idempotency for webhooks. This means if the internet blips or a server is busy, the app won't lose data or create duplicate orders.
