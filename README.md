# Fansnap Full‑Feature Prototype

This repository contains a **full‑feature prototype** for a subscription‑based creator platform inspired by services like OnlyFans.  It is designed as a starting point for development and demonstration purposes, not for production use.  All data is held in memory; there is no persistent storage, and payment processing, media uploads and security hardening are intentionally minimal.

## Features Implemented

The prototype attempts to implement, at a high level, all the functionality listed in your requirements document:

* **User Authentication** – Registration, login and logout using session cookies.  Users can be creators, subscribers or admins.
* **Profiles** – Users have editable profiles with bio, profile picture, banner, social links and subscription plan information.
* **Content Feed** – Creators can publish posts (text, images, videos, etc.) and mark them as public or subscriber‑only.  Subscribers can view public posts and subscriber‑only posts for creators they follow.
* **Subscriptions** – Subscribers can subscribe to creators on a monthly plan (plan value stored in profile).  Subscriptions are recorded in memory.
* **Store & Marketplace** – Creators can list digital products for sale.  Subscribers can place orders.  No actual payment gateway is integrated; orders are created with a `pending` status.
* **Private Messaging** – Users can send direct messages to one another and view conversation threads.
* **Tipping & Gifts** – Subscribers can send tips to creators.  Payments are not processed; tips are recorded in memory.
* **Affiliate / Referral Program** – Users can generate referral codes, record sign‑ups and track earnings based on a commission rate.
* **Search & Discover** – Simple search endpoints for users and posts.
* **AI Chatbot** – A placeholder endpoint for AI‑generated replies; real integration with OpenAI or another provider must be added.
* **Live Streaming** – A stub endpoint that returns a dummy stream token.  Integration with a streaming provider like Mux or Cloudflare Stream is required for real live streams.
* **Admin Panel (API)** – Admin users can list all users and delete posts.  A proper UI, moderation tools and reporting mechanisms must be developed separately.

## Installation & Running

This project requires Node.js (v18 or later) and npm.  You will need to install the dependencies locally because they are not included in this repository.

```
cd fansnap_full
npm install
npm start
```

The server will listen on port 3000 by default.  Use a tool like Postman or curl to interact with the JSON API.  Refer to `server.js` for endpoint definitions.

## Important Notes

1. **Not production ready:** The code lacks persistent storage, input validation, rate limiting, CSRF protection and other security measures.  It should only be used for exploration and prototyping.
2. **Payment integration:** No payment gateway (Stripe, Razorpay, etc.) has been added.  Payment‑related endpoints simply create orders or tips without handling money.
3. **Media and file uploads:** Posts support different types via the `type` field, but actual file upload/storage is not implemented.  You must integrate a storage service (AWS S3, Cloudflare R2) and handle file uploads yourself.
4. **Live streaming & AI chat:** Endpoints for live streaming tokens and AI replies are placeholders.  Integrate a live streaming provider and an AI service (e.g. OpenAI GPT) for real functionality.
5. **Admin & moderation:** The prototype provides only an API for listing users and deleting posts.  A complete admin panel with user verification, DMCA handling and analytics needs to be built.
6. **Scaling:** For a real deployment, refactor the in‑memory arrays into database models (e.g. PostgreSQL), implement migrations and indexes, and add caching and background workers as needed.

## Extending This Prototype

To transform this prototype into a fully fledged production platform, you should:

1. **Choose a persistent database** and replace the in‑memory collections with models (via an ORM like Prisma, TypeORM or Sequelize).
2. **Add authentication hardening:** Use password resets, email/phone verification, OAuth providers, two‑factor authentication and age verification.
3. **Integrate a payment gateway** (Stripe, Lemon Squeezy, etc.) for subscriptions, tips and store purchases.  Handle webhooks to update subscription status and order fulfilment.
4. **Implement media uploads and streaming** via a cloud storage provider (AWS S3 or Cloudflare R2) and a live streaming platform (Mux, Cloudflare Stream, Agora).  Use signed URLs for secure downloads.
5. **Build a front‑end** – A modern UI (e.g. React/Next.js) that consumes the API and provides a responsive experience.  Include a content feed, profile pages, subscription management, messaging interface and admin dashboards.
6. **Add moderation tools** – Reporting, blocking, content takedown, DMCA claim forms and automated content classification.  Consider AI moderation to filter harmful content.
7. **Ensure compliance** – Prepare Terms of Service, Privacy Policy, DMCA policy and consult legal experts to handle jurisdiction‑specific regulations around age‑restricted content and affiliate marketing.

This repository offers a starting point but will require significant additional work to become a safe, scalable and compliant application.