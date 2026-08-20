# Changes — Sally Skoufis theme

Every file touched, and why. The working folder `theme/` is a git repository with one commit per
phase, so anything here can be reverted individually (`git log`, `git revert <sha>`).

Baseline commit: `c247424` — the untouched export, committed before any edit.

---

## New files

| File | What it is |
|---|---|
| `assets/custom.js` | All of the store's bespoke JavaScript, previously ~14 inline blocks in `theme.liquid`. Deferred, null-guarded. |
| `snippets/seo-head.liquid` | Per-template title, meta description, canonical, robots, hreflang. |
| `assets/jquery.min.js` | Self-hosted (was `code.jquery.com`) |
| `assets/jquery.paroller.min.js` | Self-hosted (was `cdnjs.cloudflare.com`) |
| `assets/aos.js`, `assets/aos.css` | Self-hosted (was `unpkg.com`, which answered with a 302 first) |
| `assets/swiper-bundle.min.js`, `assets/swiper-bundle.min.css` | Self-hosted (was `cdn.jsdelivr.net`) |
| `assets/tiny-slider.min.css` | Self-hosted (was `cdnjs.cloudflare.com`) |
| `assets/wixmadefortext-{latin,latin-ext}-{normal,italic}.woff2` | Self-hosted Google font, latin + latin-ext |
| `assets/Bembo.woff2` | Converted from the 64.6 KB TTF — 34.9 KB |

## Deleted files

| File | Why |
|---|---|
| `assets/production-process-film.mp4` (12.9 MB) | Referenced nowhere in the theme |
| `assets/production-process-film1.mp4` (13.8 MB) | Referenced nowhere in the theme |
| `assets/flicker.gif` (3.3 MB) | The theme-asset copy is unreferenced. Templates point at a separate copy in Shopify Files, which is untouched. |
| `assets/tiny-slider-css7-4.css` | 0 bytes, referenced nowhere |
| `assets/tiny-slider-js7-4.js` | Referenced nowhere |
| `assets/logo-slider-komradd.css` | 0 bytes — **and the theme was still requesting it**. Reference removed too. |

---

## Modified files

### `layout/theme.liquid` — rewritten

The single largest change. Before: Hotjar above `<meta charset>`, six third-party origins, eight
parser-blocking scripts, ~14 inline script blocks (several **after `</body>` and inside `</html>``),
three of which threw on every page load.

- Hotjar and the respond.io chat widget now load on first interaction or when the browser goes idle.
- jQuery, paroller, AOS, tiny-slider CSS all served from `assets/`, all deferred. `defer` preserves
  execution order, so jQuery is always ready before its plugins and before `custom.js`.
- Google Fonts `<link>` replaced by self-hosted woff2, preloaded. Was three network hops before any
  body text could paint.
- Duplicate `jquery.paroller.js` removed (both `.min.js` and `.js` were loading).
- `booster-page-speed-optimizer.js` removed — it pointed at a **different store's** 2019 CDN path.
- Product metafields handed to JS through a `capture`, so `| json` always yields a string.
- `{% style %}` for the pre-order description now only renders on product templates.

### `assets/custom.js` — new, consolidates the inline scripts

- **Removed a dead PhotoSwipe init.** `PhotoSwipe`, `PhotoSwipeUI_Default` and `items` were all
  undefined; it threw on every page. The real gallery zoom is in `product-gallery.liquid`, untouched.
- Null-guarded `.homepage header`, `footer`, `.color-picker-outer`, `.color-value-selected`.
- Scroll handlers coalesced into `requestAnimationFrame`, listeners marked `passive`.
- Fixed-footer spacing moved out of a `window.load` JS write (a guaranteed post-paint layout shift)
  into a CSS custom property fed by a `ResizeObserver` — and it now survives a resize, which it didn't.
- Klaviyo `Added to Cart` passed an undefined `item`; it now sends real product fields.

### `sections/video-hero-home.liquid` — the LCP element

- Two always-downloading `<img>` posters replaced by one `<picture>`. Mobile hero 305 KB → 47.9 KB,
  desktop → 105.7 KB, mobile decode ~9 MP → ~0.56 MP.
- `alt`, `width`, `height`, `fetchpriority="high"`, `loading="eager"`, plus matching preload hints.
- New **"Hero image alt text"** setting.
- Heading blocks emit the heading element the merchant picked instead of `<p class="h1">`.
  On the homepage an `h1` is demoted to `h2`, because the header logo is already the `h1`.

### `assets/komradd.css`

- Self-hosted `@font-face` rules for Wix Madefor Text prepended (no extra request — this file
  already loads).
- Bembo now woff2-first with the TTF as fallback.
- Hero is a single element now, so the mobile display-swap rules were removed.
- `main { margin-bottom: var(--reveal-footer-height, 0px) }` plus a mobile `100vh` rule.

### `snippets/seo-head.liquid` — new

Product titles were bare (`Edge Ear Cuff`). Collection pages had **no meta description at all**.
Product descriptions were escaped twice, so `&amp;` reached the SERP as `&amp;amp;` — `strip_html`
leaves entities intact, so `escape_once` is the right filter, not `escape`.

Adds `noindex` on search/cart/customer pages, and hreflang + `x-default` when more than one locale
is published. A merchant-authored SEO title or description in admin always wins.

### `snippets/microdata-schema.liquid`

- **`CollectionPage` + `ItemList`** added. Collection pages previously had only a breadcrumb.
- `Organization` completed. The theme already emitted one from `shop.brand.*`, which is empty on
  this store, so it carried no logo and no social profiles. It now falls back to the theme's own
  social settings and the new `seo_logo` setting.

> I first added a *second* `Organization` node in `seo-head.liquid` before noticing the theme
> already had one. Removed — duplicate entity nodes are worse than a single incomplete one.

### `snippets/product-card.liquid`

The product image link's only content was an `<img>` whose `alt` Shopify renders empty when the file
has no alt text in admin — leaving the link with no accessible name. This is exactly what PageSpeed
reported as *"Links do not have descriptive text — 13 links found"*. Both media links and the
`more` colour link now carry an `aria-label`. **No visible text changed.**

### `sections/cws-announcement-bar.liquid`

Swiper self-hosted and deferred; the init moved into `DOMContentLoaded` and guarded, since deferred
scripts finish before that event.

### `sections/image-with-text-overlay.liquid`

967,162 B → 14,800 B. 98 % of the file was runaway leading whitespace, 916 KB of it inside
`{% schema %}` (which Shopify strips before sending, so most never reached a browser). Markup and
schema JSON are **proven byte-identical after whitespace normalisation**. Also removed a stray `}`
after `{% endschema %}` that rendered a literal brace into the page.

### `sections/main-collection.liquid`

- Removed a stray `</video>` with no opening tag — a leftover that closed the surrounding `<div>`
  early. This was the theme's one `LiquidHTMLSyntaxError`.
- The promo banner's hard-coded CDN image served the untouched original, eagerly, inside the product
  grid. Now sized, `srcset`ed and lazy.

### Images and headings across the theme

- 42 literal `<img>` tags had no `alt`; all now do. Decorative glyphs get `alt="" aria-hidden="true"`,
  merchant images inherit the image's own alt text.
- Every remaining deprecated `img_url` call replaced. Several requested `'master'` — the untouched
  original upload — for slots a few hundred pixels wide.
- Six merchant-image slots switched to the `image_tag` filter, which emits `width`/`height`/`srcset`
  from the image object. Missing dimensions cause layout shift; Theme Check counted 20, now 0.
- Heading levels fixed **with the visual class kept, so nothing moves on screen**: footer
  *"AS FEATURED IN"* `h4`→`h2`; product *"Barcode:"* `h5`→`p.h5` (a data label posing as a heading);
  and in `templates/product.json`, *"FREE WORLDWIDE DELIVERY"* and the subtitle, both of which sat
  directly under the `h1`.

Files: `cart-drawer`, `featured-slider`, `footer`, `image-prod-slider`, `logo-slider-komradd`,
`main-product`, `media-grid`, `quote-image-slider`, `video`, `input`, `product-card`, `product-info`.

### `config/settings_schema.json`

One new **SEO** settings group with a *"Logo for search results"* image picker. Verified by name:
one group added, none removed or altered, order preserved.

### `sections/header-group.json`

One change: the two hero PNG text images marked `loading="lazy"`. They sit inside
`.custom-video-text`, which the theme hides with `display: none !important` — but a hidden `<img>`
with a `src` still downloads. Verified structurally: this is the **only** semantic difference; the
rest of the diff is reformatting.

### Locales

`fr.schema.json` still used `global.faceting.filters_category` after English renamed it to
`filters_and_sorting_category`. `predictive-search.liquid` referenced a schema key that doesn't exist.

---

## Deliberately left alone

| | Why |
|---|---|
| Blanket `{%- -%}` whitespace sweep | Measured first: every other file is at 25–31 % leading whitespace, which is ordinary readable indentation. A sweep risks inline spacing for a few KB gzipped. |
| `icon.liquid`'s 83 KB `case`/`when` | Costs server-side evaluation, not browser time. |
| `show_image` undefined in `main-collection` breadcrumbs | Pre-existing. Undefined means the faded style always applies — which is how the page looks today. Fixing it would change the design. |
| `assets/bold-options.css`, `tape.png`, `concierge-icon.png`, `whatsapp.png` (~59 KB) | Unreferenced by filename, but unreferenced assets aren't downloaded, so removing them saves nothing measurable. Safe to delete if you want the tidiness. |
| Stale *"BLACK FRIDAY / UP TO 60% OFF"* hero copy | Content, not code — yours to change. |
| The Google tag / GA4 setup | **Verified working.** An earlier note claiming it 404'd was wrong and is retracted. Removing it would break Google Ads conversion tracking. |
| Any app install or app-embed toggle | Your call. Measured and ranked in `APP-AUDIT.md`. |
| Autoplay video in the collection grid | A design decision with a real cost. Flagged, not changed. |

---

## Commits

```
01a75b6  Validation pass: Shopify Theme Check clean of errors (32 -> 0)
382cee0  Phase 5+6: app audit, per-template SEO, heading semantics
a6b2135  Phase 4+7: HTML weight, alt text, accessible link names
20b3a2f  Phase 2+3: unblock the critical path, kill the JS errors
71e5234  Phase 1: responsive hero picture, real heading tags, defer hidden PNGs
5b715d2  Disable line-ending conversion (theme files must stay byte-identical)
c247424  Baseline: untouched Shopify theme export (Impact-based)
```
