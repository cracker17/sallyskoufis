# Performance report — Sally Skoufis theme

Baseline measured 2026-08-20 against the live site and the untouched theme export.
"After" figures are measured against the modified theme.

> **What is not in this report yet: PageSpeed scores for the new theme.**
> Scoring the rebuilt theme requires it to be running on a URL, and it isn't yet — it's a zip
> waiting to be uploaded. Everything below is a measurement of the *inputs* PageSpeed grades,
> not a claim about the score. The score verification is the first thing to do after you upload,
> and there's a step-by-step at the bottom. I'd rather hand you real numbers for the things I
> could measure than a projected score I made up.

---

## Shopify Theme Check — the one end-to-end validation available offline

Shopify's own linter, run against the baseline commit and the finished theme:

| Check | Before | After | Change |
|---|---:|---:|---:|
| **Total offences** | **104** | **47** | **−57** |
| **Errors** | **32** | **0** | **−32** |
| `ImgWidthAndHeight` | 20 | 0 | −20 |
| `DeprecatedFilter` | 20 | 0 | −20 |
| `RemoteAsset` | 16 | 2 | −14 |
| `ParserBlockingScript` | 8 | 0 | −8 |
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
