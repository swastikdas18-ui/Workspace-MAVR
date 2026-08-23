# RATE LIMITING PLAN & SPECIFICATION — WORKSPACE OS

## Executive Summary
This document defines the rate limiting policy, sliding window quotas, burst controls, and HTTP header specifications implemented in `backend/src/middleware/rate-limiter.ts`.

---

## 1. Rate Limiting Tiers

| Tier Name | Route Pattern | Window (Seconds) | Max Requests | Purpose | HTTP Action on Breach |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth Tier** | `/api/auth/*`, `/auth/*` | 60s | 20 requests | Brute-force & credential stuffing defense | 429 Too Many Requests |
| **Invite Tier** | `/api/invites/*`, `/invites/*` | 60s | 30 requests | Spam invitation prevention | 429 Too Many Requests |
| **Workspace Tier** | `/api/workspace/*`, `/workspace/*` | 60s | 120 requests | Tenant switching & membership queries | 429 Too Many Requests |
| **General API Tier**| `/api/*` | 60s | 300 requests | General CRUD & real-time query protection | 429 Too Many Requests |

---

## 2. Response Headers
When rate limiting is active, the following RFC-compliant headers are returned on all responses:
- `X-RateLimit-Limit`: Maximum allowed requests within current window
- `X-RateLimit-Remaining`: Remaining request quota in current window
- `X-RateLimit-Reset`: Seconds until quota replenishment
- `Retry-After`: Returned on HTTP 429 responses indicating retry cooldown

---

## 3. Verdict
- **Protection**: Distributed IP and User-based sliding window rate limiter active.
- **Verdict**: **RATE LIMITING: PASS**
