# Sitemap Production Diagnostic Report

**Date:** 2026-10-13T06:14:27.334Z
**Target:** https://points-miles-calculator.pages.dev

## 1. Five-Category Evidence Classification

1. **Regular HTTP Client Request (Chrome UA):** Measured live below.
2. **Simulated Googlebot UA Client Request:** Measured live below. *(Note: Spoofing the `User-Agent` header from a non-Google IP only tests UA-string filtering; it does NOT replicate real Googlebot ASN/IP reputation or prove Cloudflare never challenged Google's crawler.)*
3. **Repository Static Rules (`_headers` / `_redirects`):** `src/_headers` present: `false`; `src/_redirects` present: `false`. Verified no repo-level rules block or redirect `/sitemap.xml` or `/robots.txt`.
4. **Google Search Console Live Inspection & Sitemaps Status:** `UNAVAILABLE` *(Cannot be queried automatically by this unauthenticated script; must be read from GSC UI)*.
5. **Cloudflare WAF / Bot Historical Request Logs:** `UNAVAILABLE` *(Cloudflare Pages free tier dashboard does not expose historical raw static request logs for past Google Sitemap Processor fetches; historical edge/WAF interception can neither be confirmed nor ruled out)*.

## 2. Live Endpoint Probe: `/robots.txt`

### 1) Regular HTTP Client (Chrome UA)
- **HTTP Status:** 200
- **Final URL:** https://points-miles-calculator.pages.dev/robots.txt
- **Content-Type:** text/plain; charset=utf-8
- **Content-Length:** 87
- **Cache-Control:** public, max-age=0, must-revalidate
- **ETag:** "6517439a8356b7f0c2e7bb252a298a5c"
- **Content-Encoding:** none
- **Content:**
```text
User-agent: *
Allow: /

Sitemap: https://points-miles-calculator.pages.dev/sitemap.xml

```

### 2) Simulated Googlebot UA Client
- **HTTP Status:** 200
- **Final URL:** https://points-miles-calculator.pages.dev/robots.txt
- **Content-Type:** text/plain; charset=utf-8
- **Content-Length:** 87
- **Cache-Control:** public, max-age=0, must-revalidate
- **ETag:** "6517439a8356b7f0c2e7bb252a298a5c"
- **Content-Encoding:** none
- **Content:**
```text
User-agent: *
Allow: /

Sitemap: https://points-miles-calculator.pages.dev/sitemap.xml

```

## 2. Live Endpoint Probe: `/sitemap.xml`

### 1) Regular HTTP Client (Chrome UA)
- **HTTP Status:** 200
- **Final URL:** https://points-miles-calculator.pages.dev/sitemap.xml
- **Content-Type:** application/xml
- **Content-Length:** 12521
- **Cache-Control:** public, max-age=0, must-revalidate
- **ETag:** "28d1097e6fadb26c1630b5bd8f730247"
- **Content-Encoding:** none
- **XML Well-Formedness:** VALID
- **Response First 200 Bytes:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://points-miles-calculator.pages.dev/values/</loc>
  </url>
  <url>
    <loc>h
```
- **Complete Response SHA-256:** `6f4fef9a335f0b9b518a06960dc1e4dc599711bc05f6bdb30d4ac42d0bc82a55`
- **Total `<loc>` Count:** 110 (Unique: 110)
- **Duplicate URLs:** 0
- **URLs with Params (?):** 0
- **Non-canonical / Wrong-Origin URLs:** 0

### 2) Simulated Googlebot UA Client
- **HTTP Status:** 200
- **Final URL:** https://points-miles-calculator.pages.dev/sitemap.xml
- **Content-Type:** application/xml
- **Content-Length:** 12521
- **Cache-Control:** public, max-age=0, must-revalidate
- **ETag:** "28d1097e6fadb26c1630b5bd8f730247"
- **Content-Encoding:** none
- **XML Well-Formedness:** VALID
- **Response First 200 Bytes:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://points-miles-calculator.pages.dev/values/</loc>
  </url>
  <url>
    <loc>h
```
- **Complete Response SHA-256:** `6f4fef9a335f0b9b518a06960dc1e4dc599711bc05f6bdb30d4ac42d0bc82a55`
- **Total `<loc>` Count:** 110 (Unique: 110)
- **Duplicate URLs:** 0
- **URLs with Params (?):** 0
- **Non-canonical / Wrong-Origin URLs:** 0

## 3. Sitemap URL Set Comparison (Local Build vs. Production)

- **Local Build `_site/sitemap.xml` Unique URLs:** 110
- **Production `/sitemap.xml` Unique URLs:** 110
- **Added in Local Build (0):** None
- **Removed in Local Build (0):** None

## 4. Diagnostic Status Matrix (Assertion-Driven)

| Dimension | Status | Evidence Basis |
| :--- | :--- | :--- |
| **Technical Accessibility** | **PASS** | `/sitemap.xml` and `/robots.txt` return HTTP 200, well-formed XML (<urlset>), 110 unique URLs, 0 duplicates, and 0 origin mismatches; Verified 0 canonical/hreflang errors across 110 pages in local build. |
| **Canonical / Hreflang Audit** | **PASS** | Verified 0 canonical/hreflang errors across 110 pages in local build |
| **Sitemap Processed (GSC)** | **UNAVAILABLE** | Cannot be verified via static HTTP probe; must be checked in GSC Sitemaps UI (last observed UI state: `Couldn't fetch`). |
| **Cloudflare Historical Logs** | **UNAVAILABLE** | Cloudflare Pages free tier does not retain historical static request logs for past Googlebot fetches. |
| **Google Indexed** | **NOT TESTED** | Sitemap presence does not equal indexation; check GSC Pages / URL Inspection for individual URL indexing status. |
| **Search Clicks** | **NOT TESTED** | Tracked separately in GSC Performance report. |
