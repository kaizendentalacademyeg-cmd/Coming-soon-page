# Spec 6: Payment Integration & Policy Pages

## Status: 🟡 Partially Complete (UI done, Paymob integration deferred to deployment)

## Overview
Integrate Paymob payment gateway and create dynamic policy pages served from Supabase.

## Paymob Integration

### Serverless Functions (Vercel)
- `api/create-payment.js` — Creates Paymob payment intention
- `api/payment-webhook.js` — Handles Paymob callback + HMAC verification

### Payment Flow
1. User selects pricing tier → clicks "Pay"
2. Client calls `api/create-payment.js` with enrollment ID
3. Server creates Paymob payment intention
4. User is redirected to Paymob checkout iframe
5. On success, Paymob sends webhook to `api/payment-webhook.js`
6. Server verifies HMAC, updates enrollment status
7. User is redirected to `payment-callback.html`

### Security
- Paymob API keys in Vercel env vars only
- HMAC signature verification
- Server-side amount validation
- Idempotency checks

## Policy Pages
- `policy.html` — Dynamic template loading policy content by slug
- Supported slugs: `refund-policy`, `payment-policy`, `privacy-policy`, `terms-and-conditions`
- Content managed from admin panel

## Deployment Config
- `vercel.json` — Routes, headers, env variable mapping

## Files
- [NEW] `policy.html`
- [NEW] `vercel.json`
- [NEW] `api/create-payment.js`
- [NEW] `api/payment-webhook.js`
- [NEW] `payment-callback.html`

## Dependencies
- Supabase database (enrollments table)
- Paymob account + API credentials
- Vercel deployment
