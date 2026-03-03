# Security Standards & Architecture Policy

This document defines the strictly enforced security architecture, development practices, and database hardening rules for this repository. This application handles production user data and privileged database access. **All requirements detailed here are non-optional and must be validated during code review.**

## Table of Contents
1. [Core Security Principles](#1-core-security-principles)
2. [Enforced Architecture](#2-enforced-architecture)
3. [API & Data Fetching Hardening](#3-api--data-fetching-hardening)
4. [Database & RLS Hardening](#4-database--rls-hardening)
5. [Pre-Merge & CI/CD Requirements](#5-pre-merge--cicd-requirements)
6. [Incident Response Plan](#6-incident-response-plan)

---

## 1. Core Security Principles

### 1.1 Secret Management
- **Zero Secrets in Version Control:** Never commit `service_role` keys, JWT secrets, database passwords, or private API keys. 
- **Environment Variable Scoping:** Client-side environment variables must be prefixed with `NEXT_PUBLIC_` and must **only** contain non-sensitive configuration data (e.g., public URLs, anonymous keys).
- **Service Role Isolation:** The `service_role` key grants administrative access bypassing all Row Level Security (RLS). It may **only** be instantiated in secure server environments:
  - Next.js Route Handlers (`src/app/api/**`)
  - Server Actions (with explicit authorization checks)
  - Edge/Serverless functions and trusted background workers.

### 1.2 Assume Client Compromise
- **Public Keys are Public:** Assume any key sent to the browser (even anonymous ones) can and will be extracted.
- **Defense in Depth:** Client-side validation is strictly for UX. All data protection, authorization, and validation must be enforced via Database RLS, safe RPCs, and server-side checks.

### 1.3 Surface Area Reduction
- **Window Object:** Do not attach privileged objects, user data, or configuration details to the global `window` object unless strictly required and reviewed.
- **CORS Policy:** Broad CORS configurations (`Access-Control-Allow-Origin: *`) are prohibited. Explicitly define allowed origins based on environment (e.g., staging vs. production domains).

---

## 2. Enforced Architecture



### 2.1 Privileged Writes (Server-Side Only)
- Direct writes (INSERT, UPDATE, DELETE) to protected tables from client code are strictly prohibited.
- All privileged writes must route through Next.js Route Handlers (`src/app/api/**`) or secured Server Actions.
- **Every privileged server route must implement:**
  1. **Authentication:** Verify via `Authorization: Bearer <JWT>` or secure HttpOnly session cookies.
  2. **Input Validation:** Strictly parse and sanitize incoming payloads using a schema validator (e.g., `zod`).
  3. **Rate Limiting:** Protect against brute-force and DDoS (e.g., using Redis/Upstash).
  4. **Service Role Execution:** Only after passing steps 1-3, use the `service_role` client to perform the database operation.

### 2.2 Anonymous Activity
- **Local-First State:** Anonymous activity must remain local (e.g., `localStorage`, IndexedDB) until the user explicitly creates an account and logs in.
- **Authenticated Cloud State:** Cloud storage is exclusively for authenticated users. This applies to:
  - User watchlists
  - Recently viewed items
  - Watch progress
  - Any PII (Personally Identifiable Information)

---

## 3. API & Data Fetching Hardening

### 3.1 Click Tracking & Analytics
- **Server-Side Enforcement:** Use a Next.js API route with strict rate limiting and `service_role` database writes.
  - *Example:* `/api/ad-click` validates the payload, checks rate limits, and calls `record_ad_click()` via service role.
- **Public Analytics:** Any public endpoint accepting analytics must accept only strictly sanitized payloads and enforce bot-mitigation checks (e.g., reCAPTCHA, Turnstile).

### 3.2 Internal Helpers & Clients
- **`authFetch`:** Must be used for all user-authenticated endpoints. It automatically handles appending the user's JWT.
- **`apiFetch`:** Reserved strictly for management portal calls.
- **Admin Endpoints:** All `/api/admin/**` endpoints must verify that the requesting user possesses an 'admin' role in their JWT claims before instantiating the `service_role` client.

---

## 4. Database & RLS Hardening

### 4.1 Row Level Security (RLS) is Mandatory
- **Default State:** Any public or semi-public table must have RLS enabled.
- **Strict Policies:** Avoid overly permissive write policies. Policies like `WITH CHECK (true)` for `INSERT`/`UPDATE` are prohibited unless heavily restricted by role and specific conditions.
- **Protected Tables:** The following must have explicitly tight RLS policies or be restricted entirely to `service_role`:
  - Admin configuration tables
  - Push token registries
  - User profile/billing data
  - Sensitive business logic data

### 4.2 Function (RPC) Hardening
- **Grant Execution Safely:** Revoke default execution rights. Only grant `EXECUTE` to the specific roles that require it (often exclusively `service_role`).
  ```sql
  REVOKE EXECUTE ON FUNCTION my_sensitive_function FROM PUBLIC;

### GRANT EXECUTE ON FUNCTION my_sensitive_function TO service_role;

## SECURITY DEFINER Search Path Mitigation

All `SECURITY DEFINER` functions (which run with the privileges of the creator) are vulnerable to search path hijacking. You must fix the search path explicitly:

```sql
CREATE OR REPLACE FUNCTION secure_admin_action()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions -- REQUIRED
AS $$
BEGIN
  -- Function logic here
END;
$$;
```

## 5. Pre-Merge & CI/CD Requirements

No code may be merged into `main` or production branches without passing the following checks:

### 5.1 Automated Secret Scanning
The repository must be scanned on every PR for leaked keys (e.g., using TruffleHog, Gitleaks, or GitHub Advanced Security).
*   **Fails on:** service_role keys, JWTs (`eyJ...`), AWS credentials, or hardcoded passwords.

### 5.2 Database Security Advisory
Any pull request altering database schemas, RLS policies, or RPC functions must run:
*   **Security Advisor:** To flag permissive RLS policies or missing `search_path` declarations.
*   **Performance Advisor:** To ensure new queries do not introduce vulnerability to ReDoS (Regular Expression Denial of Service) or unindexed table scans.

### 5.3 Manual Code Review Mandates
Reviewers must explicitly verify:
*   No public tables allow anonymous inserts without an intermediary validation/rate-limiting server route.
*   Admin endpoints properly restrict access via RBAC (Role-Based Access Control).

### 5.4 Accepted Known Risks

The following security trade-offs are accepted by design and must not be "fixed" without a full architecture review:

**`script-src 'unsafe-inline'` in Content-Security-Policy**

Next.js 14 with `output: 'export'` inlines a small hydration bootstrap `<script>` block that cannot be hashed or nonced. This requires `'unsafe-inline'` in `script-src`. Without it, the React tree fails to hydrate and the app becomes non-functional.

This means the CSP provides **no script-injection backstop** for XSS. All XSS mitigation relies on:
- DOMPurify sanitization of all HTML rendered via `dangerouslySetInnerHTML`
- React's default output escaping for all `{expression}` interpolations
- The `<iframe sandbox="">` for HTML and markdown preview panes

A nonce-based or hash-based CSP would eliminate this risk but requires a custom Next.js server runtime — incompatible with fully static export. If the app ever adds a server runtime, this must be revisited.

## 6. Incident Response Plan

If a sensitive key (e.g., `service_role`, JWT secret) is exposed, or a breach is suspected, initiate the following immediately:

1.  **Containment (Rotate):** Invalidate and rotate the impacted keys immediately via the hosting provider dashboard. Update environment variables across all environments.
2.  **Investigation (Audit):**
    *   Audit all recent RLS policy changes and function grants.
    *   Review server and database logs for anomalous access patterns, data exfiltration, or unauthorized privilege escalation.
3.  **Eradication & Recovery:** Revert any unauthorized changes. Deploy patches to close the vulnerability (e.g., fixing a missing validation check).
4.  **Post-Mortem:** Add a specific regression test and update this document/CI pipeline to permanently prevent the specific recurrence.