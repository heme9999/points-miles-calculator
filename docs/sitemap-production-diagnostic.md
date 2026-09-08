# Sitemap Production Diagnostic Report

**Date:** 2026-09-08T15:11:53.033Z
**Target:** https://points-miles-calculator.pages.dev

## File: /robots.txt

### Chrome UA
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

### Googlebot UA
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

## File: /sitemap.xml

### Chrome UA
- **HTTP Status:** 200
- **Final URL:** https://points-miles-calculator.pages.dev/sitemap.xml
- **Content-Type:** application/xml
- **Content-Length:** 11246
- **Cache-Control:** public, max-age=0, must-revalidate
- **ETag:** "652fcfe331356f6a482e327d2304db55"
- **Content-Encoding:** none
- **Response First 200 Bytes:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://points-miles-calculator.pages.dev/</loc>
    <lastmod>2026-08-22</lastmod>

```
- **Complete Response SHA-256:** `33c072c255f531c2c80bd6fd37bf66d735a48e32d28dc7d29579c96bed740d49`
- **<loc> Count:** 104
- **Duplicate URLs:** 0
- **URLs with Params (?):** 0
- **Non-canonical Host URLs:** 0

### Googlebot UA
- **HTTP Status:** 200
- **Final URL:** https://points-miles-calculator.pages.dev/sitemap.xml
- **Content-Type:** application/xml
- **Content-Length:** 11246
- **Cache-Control:** public, max-age=0, must-revalidate
- **ETag:** "652fcfe331356f6a482e327d2304db55"
- **Content-Encoding:** none
- **Response First 200 Bytes:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://points-miles-calculator.pages.dev/</loc>
    <lastmod>2026-08-22</lastmod>

```
- **Complete Response SHA-256:** `33c072c255f531c2c80bd6fd37bf66d735a48e32d28dc7d29579c96bed740d49`
- **<loc> Count:** 104
- **Duplicate URLs:** 0
- **URLs with Params (?):** 0
- **Non-canonical Host URLs:** 0

## Cloudflare Configuration Analysis
- **WAF / Bot Fight Mode:** Checked project settings. Cloudflare Pages default domains (`pages.dev`) sometimes have strict automated bot protections. Since our Googlebot UA returned 200 (if confirmed above), Bot Fight Mode is not blocking Googlebot.
- **Redirect / Transform Rules:** None configured that intercept `/sitemap.xml`.
- **_headers:** Checked `src/_headers`. No rules block or restrict Googlebot from `/sitemap.xml`.
- **_redirects:** Checked `src/_redirects`. No rules redirect `/sitemap.xml`.
