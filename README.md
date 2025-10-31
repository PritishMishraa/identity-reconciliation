# Identity Reconciliation

Links customer identities across different contact details. Helps stores recognize that the customer who ordered plutonium is the same one who bought the flux capacitor.

## What It Does

- **Links contacts** based on shared email or phone numbers
- **Maintains primary-secondary relationships** for identity chains
- **Optimized reconciliation** in at most 3 database queries
- **Merges multiple identity chains** when new connections are discovered

## Tech Stack

- **Hono** – Lightweight web framework
- **Cloudflare Workers** – Edge runtime
- **Drizzle ORM** – Type-safe database toolkit
- **Cloudflare D1** – Serverless SQLite database
- **Zod** – Schema validation
- **Vitest** – Unit testing

## Quick Start

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

## API

**POST** `/identify`

```json
{
  "email": "user@example.com",
  "phoneNumber": 1234567890
}
```

Returns a consolidated contact with all linked emails, phone numbers, and secondary contact IDs.
