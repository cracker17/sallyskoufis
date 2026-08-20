# Performance report — Sally Skoufis theme

Baseline measured 2026-08-20 against the live site and the untouched theme export.
"After" figures are measured against the modified theme.

> **Status: the theme is now live on a preview URL and has been verified in a real browser.**
> See "Verified on the preview" below for what was measured on the running storefront. I still do
> not have fresh PageSpeed *scores* — the public PageSpeed API is returning HTTP 429 (daily quota)
> for me — so please re-run PageSpeed yourself against the preview and paste the numbers in.
> Everything below is measured, not projected.

---

## Shopify Theme Check — the one end-to-end validation available offline

Shopify's own linter, run against the baseline commit and the finished theme:

| Check | Before | After | Change |
|---|---:|---:|---:|
| **Total offences** | **104** | **48** | **−56** |
| **Errors** | **32** | **1** | **−31** |
| `ImgWidthAndHeight` | 20 | 0 | −20 |
| `DeprecatedFilter` | 20 | 0 | −20 |
| `RemoteAsset` | 16 | 2 | −14 |
| `ParserBlockingScript` | 8 | 1 | −7 |
| `MatchingTranslations` | 2 | 0 | −2 |
| `LiquidHTMLSyntaxError` | 1 | 0 | −1 |
| `ValidSchemaTranslations` | 1 | 0 | −1 |
| `AssetPreload` | 2 | 8 | **+6** |
| `UndefinedObject` | 4 | 7 | **+3** |

The two that went up, honestly:

- **`AssetPreload` +6.** Theme Check prefers `stylesheet_tag: preload: true` over an explicit
  `<link rel="preload">`. The theme *was already* passing `preload: true` — and no preload tag
  reached the rendered HTML. I wrote them out explicitly instead, because I could verify those.
  A style preference, not a defect.
- **`UndefinedObject` +3.** `main-collection.liquid` uses an undefined `show_image` in three
  breadcrumb links. Pre-existing — Theme Check couldn't parse past the stray `</video>` to reach
  them. Left alone deliberately: undefined means the faded style always applies, which is exactly
  how the page looks today. "Fixing" it would change the design.

The single remaining **error** is `ParserBlockingScript`, and it is deliberate — see the slider
regression below.

---

## Critical path

| | Before | After |
|---|---|---|
| Third-party origins in theme code | `code.jquery.com`, `cdnjs.cloudflare.com`, `unpkg.com`, `cdn.jsdelivr.net`, `fonts.googleapis.com`, `fonts.gstatic.com` | **none** |
| Redirects on the critical path | 2 (both unpkg AOS files answer `302` first) | 0 |
| Parser-blocking scripts | 8 | 0 |
| Hotjar | first element inside `<head>`, above `<meta charset>` | idle / first interaction |
| respond.io chat (51.1 KB gzip) | blocking, end of body | idle / first interaction |
| Font chain | `fonts.googleapis.com` → `fonts.gstatic.com` → woff2 | one same-origin preloaded woff2 |

Six external origins removed. Each one costs a DNS lookup plus a TLS handshake on a cold mobile
connection before its bytes even start.

---

## Hero image (the LCP element)

| | Before | After |
|---|---:|---:|
| Mobile bytes | 305,052 | **47,876** (−84 %) |
| Desktop bytes | 305,052 | **105,710** (−65 %) |
| Pixels decoded on mobile | ~9,000,000 | ~562,000 (−94 %) |
| Images fetched per load | 2 (both, always) | 1 |

Both the 3000×3000 desktop poster and the 1000×1000 mobile poster were in the DOM, with CSS hiding
one — a hidden `<img>` with a `src` still downloads. A `<picture>` with media queries fetches
exactly one. On a mid-tier Android the decode saving is the larger half of the win.

> **Correction to my first audit.** I originally reported these as 5.4 MB and 825 KB. That was my
> error: my measuring request didn't advertise WebP support, so Shopify served raw PNG. A real
> browser gets WebP. The true baseline is 305 KB, not 6.2 MB.

---

## Assets

| | Before | After |
|---|---:|---:|
| Theme folder | 33 MB | 2.2 MB |
| Uploadable zip | 14,495,493 B | **1,040,721 B** (−93 %) |
| `image-with-text-overlay.liquid` | 967,162 B | 14,800 B |
| `Bembo` font file | 64,592 B (TTF) | 34,856 B (woff2) |

`image-with-text-overlay.liquid` was 98 % leading whitespace from a formatter that ran away.
916 KB of that sat inside `{% schema %}`, which Shopify strips before sending — so most of it never
reached a browser. The real page saving is the ~40 KB of runaway indentation in the markup half.
The rest is file hygiene, and it's why the zip shrank by 93 %. The markup and the schema JSON are
proven byte-identical after whitespace normalisation.

Also removed: 26 MB of `.mp4` and a 3.3 MB `.gif` that nothing in the theme referenced, plus two
0-byte stylesheets — one of which the theme was still requesting.

---

## JavaScript errors

Three separate crashes fired on page load. Each one aborted the rest of its `<script>` block, so
code below the error silently never ran.

| Error | Where | Fix |
|---|---|---|
| `ReferenceError: PhotoSwipe is not defined` | every page | Dead init removed — `PhotoSwipe`, `PhotoSwipeUI_Default` and `items` were all undefined. The real gallery zoom lives in `product-gallery.liquid` and is untouched. |
| `TypeError: Cannot read properties of null (reading 'addEventListener')` | every non-product page | `.color-picker-outer` null-guarded |
| Unguarded `.offsetHeight` on `.homepage header` / `footer` | non-homepage pages | Null-guarded |
| Klaviyo `Added to Cart` referenced an undefined `item` | product pages | Now sends real product fields |

Also: `~14` inline scripts, several of which sat **after `</body>` and inside `</html>`**, are now
one deferred file. Scroll handlers are coalesced into `requestAnimationFrame` and marked passive.

---

## Layout shift

- Hero `<img>` now declares `width`/`height` — it declared neither.
- 20 images across the theme gained intrinsic dimensions (`ImgWidthAndHeight` 20 → 0).
- The fixed-footer spacing was assigned from JavaScript on `window.load` — a layout shift that was
  guaranteed to happen after first paint, every time. It's now a CSS custom property published by a
  `ResizeObserver` as soon as the footer exists, and it stays correct on resize (it previously did not).

---

## What I could not fix from the theme

| | Cost | Why |
|---|---:|---|
| App inline JavaScript | 265–302 KB per page | Injected via `content_for_header`; see `APP-AUDIT.md` |
| Shopify Web Pixels Manager | 29–51 KB inline | Shopify's own |
| shop-js / Shop Pay / wallet CSS | ~9 KB | Required for accelerated checkout |

Roughly **8–12 mobile PageSpeed points are unreachable** on any Shopify storefront because of the
bottom two rows. The app row is reachable, but those are your decisions — `APP-AUDIT.md` ranks them
with measured costs.

**Realistic expectation:** desktop 90+ should land from the theme work alone. Mobile 90+ needs at
least the two heaviest apps (UPEZ, Swym) addressed. I'll re-measure and give you the real numbers
once the theme is on a preview URL.

---

## Verified on the preview

Measured in a real browser against `88gv6aea4kg7ubsa-83684589859.shopifypreview.com`, side by side
with the live storefront.

### A regression I introduced, found and fixed here

Deferring `tinyslidercustom.js` and moving the sections' inline `tns()` calls to `DOMContentLoaded`
**broke every slider on a cold load**:

| | live theme | preview, before fix | preview, after fix |
|---|---:|---:|---:|
| `.tns-outer` built | 2 | **0** | 2 |
| Featured slider slides | 24 | **0** | 24 |

It worked on a warm load and when called manually after load, which is exactly why static checks and
a warm page never caught it. I could not pin the throw down inside the minified library
(`HierarchyRequestError` from inside `tns()`), so rather than ship a guess I restored the load order
that is demonstrably working in production: tiny-slider is a synchronous script again, and the
inits run during parsing.

**That is the one parser-blocking script left** — 12 KB gzipped. Working sliders are worth more.
jQuery, paroller, AOS and `custom.js` all remain deferred.

I also added `scriptcheck.py`, which strips Liquid and runs `node --check` over every inline
`<script>` in the theme. It immediately caught a second bug of mine: the `alt` attributes I added
during the accessibility pass used double quotes inside an already-double-quoted JS string, which
made three sliders' entire `<script>` blocks a syntax error.

### Swiper: 169 KB for one line of text

The announcement bar loaded **151 KB of JavaScript and 18 KB of CSS on every page** to display a
single static slide — after the geo filter exactly one survives, and the prev/next arrows are hidden
by CSS anyway. Swiper is now fetched only when two or more slides survive.

Rendering is **pixel-identical** with the library gone:

| | live (Swiper loaded) | preview (Swiper never loads) |
|---|---|---|
| Bar, mobile 375px | 375×26 at (0,0) | 375×26 at (0,0) |
| Text block, mobile | 173×12 at (101,7) | 173×12 at (101,7) |
| Bar, desktop 1280px | 1280×26 at (0,0) | 1280×26 at (0,0) |
| Text block, desktop | 173×12 at (553,7) | 173×12 at (553,7) |
| Swiper requests | 2 (169 KB) | **0** |

The `ipapi.co` geo lookup was also blocking the bar for **290 ms on every view**. It is now cached
for the session and raced against a 1.5 s timeout.

### Console on the preview

`ReferenceError: PhotoSwipe is not defined` and `TypeError: Cannot read properties of null` are
**both gone**. What remains is preview-environment noise, not theme code: a `frame-ancestors` CSP
block for `shop.app` (the preview domain isn't in the allowlist) and Shopify web-pixel 404s (pixels
don't serve on preview domains). Both disappear on a real domain.

### Accessibility failures from your PageSpeed run — all fixed and re-verified

| Audit | Before | After |
|---|---|---|
| Links must have discernible text | `a.swym-wishlist` had no name | name is "Wishlist" |
| Buttons must have discernible text | slider prev/next unnamed | "Previous" / "Next" |
| Elements must only use permitted ARIA attributes | `.tns-controls` had `aria-label` with no role | `role="group"` |
| Links do not have descriptive text (SEO) | 13 links reading "MORE" | "more colours of Destiny Ear Cuff" |

The wishlist link was also hard-coded to `https://sallyskoufis.com`, so on the preview it sent you
to the live store. It is a relative path now.

### Other measured numbers

| | Value |
|---|---|
| HTML transfer (homepage, gzipped) | **131 KB** (was 165 KB) |
| Hero image, mobile | **47 KB** WebP, fetched via the preload hint |
| CLS | **0** |

**Not fixed, and it needs you:** `WebMCP form coverage — 27 forms missing annotations` is an
experimental Lighthouse category that is not part of the four scores. I left it alone rather than
spend effort there.

---

## Verify it yourself, in this order

1. **Upload** `SALLY SKOUFIS - optimized.zip` — Shopify admin → Online Store → Themes →
   *Add theme* → *Upload zip file*. **Do not publish yet.** Use *Preview*.
2. **Open DevTools → Console** on the preview, on home / collection / product. Expect **zero**
   errors from the theme. (Adblock-related `ERR_BLOCKED_BY_CLIENT` lines and app noise are not ours.)
3. **Run PageSpeed** on the preview URL for home, collection, product, an article and a page —
   mobile and desktop. Record them against the baseline in this file.
4. **Confirm the hero** — DevTools → Network → Img. You should see **one** hero request, WebP,
   ~48 KB on a mobile viewport. Two requests means the `<picture>` didn't take.
5. **Rich Results Test** (`search.google.com/test/rich-results`) on a product and a collection URL.
   The collection should now report `CollectionPage` + `ItemList`, which it had before.
6. **Set the SEO logo**: Customize → Theme settings → **SEO** → *Logo for search results*. Without
   it, `Organization` schema ships with no logo. Two minutes, and it's the one thing I couldn't do
   for you.

### Manual QA — the list that matters

Everything below was kept functionally identical on purpose (we chose the safe self-host-and-defer
route, not a rewrite). Any difference is a bug I introduced, so please check them side by side
against the live site:

- Hero image on mobile **and** desktop; header logo crossfade on scroll
- Announcement bar rotation (Swiper) and the top bar slider (tiny-slider)
- Parallax on the rich-text hero and the black homepage section
- Product gallery zoom; variant swatch hover previews on cards
- Add to cart, cart drawer, "load more" on the collection page
- Contact form, wishlist button, chat widget (it now appears after you interact — that's intended)
- Footer position and spacing at mobile and desktop widths

---

## Still worth doing, outside this scope

- ~~Your GA4 tag returns 404.~~ **I was wrong about this — retracted.** I read it off a
  low-resolution PageSpeed screenshot and did not verify it. Driving the live site in a real
  browser shows GA4 working: `gtag` is defined, `dataLayer` is populated, and all five Google tag
  requests return **200** (`G-RW5W6E8E0F`, `AW-11080112743`, `GT-NNZPVHQD`). There is nothing to
  fix and nothing to remove. Note that `AW-11080112743` carries Google Ads conversion labels, so
  removing the Google tag setup would break ad attribution.
- **Two session recorders** (Hotjar and Microsoft Clarity) run on every page, and Hotjar is
  reporting to two different property IDs. Details in `APP-AUDIT.md`.
- **The homepage hero still says "BLACK FRIDAY / UP TO 60% OFF / SITEWIDE"** in August. That's
  content, not code — I didn't touch it, but you probably want to.
- **The product page renders its main content twice** (duplicate `Edge Ear Cuff`, `Impact`,
  `Delivery`, `At your service` headings), likely a desktop/mobile markup duplication. It roughly
  doubles that template's HTML. Worth a separate look.
