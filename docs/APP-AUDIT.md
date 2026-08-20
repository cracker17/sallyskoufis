# App audit — sallyskoufis.com

Measured 2026-08-20 against the live site, on the homepage, an "all products" collection page and a
product page. Inline bytes are raw HTML; external bytes are gzipped transfer as a real mobile Chrome
receives them.

**Nothing here has been uninstalled or switched off.** These are decisions for you; my job was to
measure them. The theme changes I did make (deferring the chat widget and the hard-coded Hotjar
snippet) are described at the bottom.

---

## The short version

Apps put **265–302 KB of inline JavaScript into every page**, before a single external app file
downloads. Two apps are three quarters of it.

| App | Inline JS/page | External JS+CSS (gzip) | Share of all inline JS |
|---|---:|---:|---:|
| **UPEZ** (upsell / bundles / free gift) | 112–117 KB | 8.1 KB | **38–44 %** |
| **Swym Wishlist Plus** | 64–92 KB | 106.7 KB | **25–31 %** |
| Globo Product Options | 11.3–15.8 KB | 15.4 KB | 4–5 % |
| HulkApps Form Builder | 11.4 KB | 2.2 KB | 3–4 % |
| Klaviyo | 0.6–3.9 KB | 1.8 KB | <1 % |
| Hotjar | 0.7 KB | (external, deferred) | <1 % |
| Microsoft Clarity | small | external | <1 % |
| respond.io chat | — | 51.1 KB | — |
| Shopify Web Pixels Manager | 29–51 KB | — | (not removable) |
| Shopify shop-js / Shop Pay | 2.8 KB | 4.5 KB | (not removable) |

---

## Ranked: what to remove, and what it buys you

### 1. UPEZ — the single biggest win
**Cost:** ~115 KB of inline JS on *every* page, including pages with nothing to upsell.
**Estimated recovery: 6–9 mobile PageSpeed points.**

It ships the full free-gift discount table, selling-plan groups and bundle-builder config inline on
the homepage and every collection page, not just where an upsell can appear. A `String.prototype.replaceAll`
polyfill accounts for another 28 KB — that's a shim for browsers Shopify itself no longer supports.

**Before removing:** check whether the free-gift and bundle promotions are actually running. The
config referenced live product IDs, so something is configured. If the promotions are dormant,
this is the cheapest large win available.

### 2. Swym Wishlist Plus — the biggest total footprint
**Cost:** 64–92 KB inline **plus 106.7 KB of external gzipped JS/CSS** — the largest single
external download on the site (`storefront-layout-components.js` alone is 76.9 KB gzipped).
**Estimated recovery: 5–8 mobile PageSpeed points.**

**Worth knowing:** you have a *second*, older wishlist app still installed — **Wishlist King**. All
six of its theme blocks are switched off, so it isn't costing you anything on page load, but the app
is still connected to the store. Uninstalling it is free tidying.

**Before removing Swym:** wishlists drive repeat visits for jewellery. Check your Swym dashboard for
actual save/return numbers before trading it away for points.

### 3. Two session recorders are running at once
**Hotjar and Microsoft Clarity are both active on every page.** They do the same job — heatmaps and
session replay. There is no reason to pay for both in page weight.

**This needs your decision, and there's a wrinkle I did not want to resolve for you.** The store is
sending Hotjar data to **two different properties**:

- site ID `3802428` — hard-coded in the theme (this is the one I moved to a deferred load)
- site ID `3134281` — injected by the Hotjar app embed

I left both in place. Silently disabling one would have stopped data flowing to a property you might
be the one actually using. Check which property has your real history, then keep exactly one, and
pick one tool between Hotjar and Clarity.
**Estimated recovery: 1–3 points, plus cleaner analytics.**

### 4. Globo Product Options — gate it to product pages
**Cost:** 11–16 KB inline everywhere. It is only meaningful on product pages.
Shopify app embeds inject globally and the theme cannot scope them, so this one has to be handled in
the app's own settings if it offers page targeting, or accepted.
**Estimated recovery: 1–2 points.**

### 5. HulkApps Form Builder — gate it to the contact page
**Cost:** 11.4 KB inline on every page, for a form that appears on one.
Same constraint: it is an app embed. If HulkApps offers page targeting, restrict it to `/pages/contact`.
**Estimated recovery: 1 point.**

### 6. Timesact pre-order
Its markup appears **25 times on the homepage**, where there are no products at all. Worth asking the
vendor why, or restricting it to product templates.

### 7. respond.io chat widget — already handled
51.1 KB gzipped. I changed the theme so it loads on first interaction or when the browser goes idle,
rather than during page load. No action needed from you, and the widget still works.

---

## Not removable — don't chase these

| What | Cost | Why it stays |
|---|---:|---|
| Shopify Web Pixels Manager | 29–51 KB inline | Shopify's own analytics layer, injected via `content_for_header` |
| shop-js / Shop Pay / checkout preloads | ~7 KB | Required for accelerated checkout |
| `portable-wallets` CSS | 1.6 KB | Apple Pay / Google Pay buttons |

Together these cost roughly **8–12 mobile PageSpeed points that no amount of theme work can recover**.
This is the ceiling every Shopify store runs into, and it's why a mobile 90 is hard here while a
desktop 90 is straightforward.

---

## Correction: Google Analytics is fine

An earlier version of this file said your GA4 was broken and returning 404. **That was wrong, and
I've retracted it.** I read it off a low-resolution PageSpeed screenshot instead of verifying it.

Driving the live site in a real browser: `gtag` is defined, `dataLayer` is populated, and every
Google tag request returns **200**. The configured IDs are `G-RW5W6E8E0F` (GA4),
`AW-11080112743` (Google Ads), `GT-NNZPVHQD` (Google Tag) and `MC-LK7JBJD006` (Merchant Center),
all injected by Shopify's Web Pixels Manager from the Google & YouTube channel.

Nothing to remove here — and the Google Ads ID carries conversion action labels, so tearing out the
Google tag setup would break your ad attribution.

---

## What I changed in the theme

| Change | Effect |
|---|---|
| respond.io chat moved to idle / first-interaction load | 51 KB off the measured page load |
| Hard-coded Hotjar (site `3802428`) moved out of the top of `<head>` | It sat *above* `<meta charset>`, blocking the parser before anything else could start |

Both are reversible — they live in `layout/theme.liquid` under the "DEFERRED THIRD PARTIES" comment.

I did **not** disable any app embed. Those toggles are in `config/settings_data.json` and are yours
to flip in Shopify admin under *Online Store → Themes → Customize → App embeds*.
