# Sally Skoufis — Shopify theme

Performance and SEO overhaul of the store's customised **Impact** theme (Maestrooo).

The theme files sit at the repository root (`assets/`, `config/`, `layout/`, `locales/`,
`sections/`, `snippets/`, `templates/`), which is the layout Shopify's GitHub integration expects.

---

## Connecting this repo to Shopify

1. Shopify admin → **Online Store → Themes**
2. **Add theme → Connect from GitHub**
3. Pick this repository and the **`main`** branch
4. Shopify adds it as an **unpublished** theme — use **Preview**, and do not publish until you've
   checked it

Once connected the sync runs both ways: commits pushed here appear in the theme, and edits made in
Shopify's theme editor are committed back to this branch.

> **Do not publish over the live theme until the checks in `docs/PERF-REPORT.md` pass.** Everything
> here was validated statically; none of it has been exercised on a real storefront yet.

---

## History

One commit per phase, so anything can be reverted on its own.

| Commit | What |
|---|---|
| `c247424` | **Baseline** — the untouched theme export, before any edit |
| `5b715d2` | Pin line endings so theme files stay byte-identical |
| `71e5234` | Phase 1 — responsive hero `<picture>`, real heading tags |
| `20b3a2f` | Phase 2+3 — unblock the critical path, kill the JS errors |
| `a6b2135` | Phase 4+7 — HTML weight, alt text, accessible link names |
| `382cee0` | Phase 5+6 — per-template SEO and structured data |
| `01a75b6` | Validation — Shopify Theme Check errors 32 → 0 |
| `2ebfa93` | Fix two slider regressions introduced during the accessibility pass |

`git diff c247424 HEAD` shows the complete change against the original theme.

---

## Headline results

| | Before | After |
|---|---:|---:|
| Theme Check errors | 32 | **0** |
| Theme Check offences | 104 | 47 |
| Parser-blocking scripts | 8 | **0** |
| Third-party origins on the critical path | 6 | **0** |
| Images missing `width`/`height` | 20 | **0** |
| Mobile hero payload | 305 KB | **47.9 KB** |
| Theme folder | 33 MB | **2.2 MB** |

Three JavaScript errors that fired on every page load — a dead PhotoSwipe init and two unguarded
`querySelector` dereferences — are gone.

---

## Documentation

| File | What's in it |
|---|---|
| `docs/PERF-REPORT.md` | Every before/after measurement, and the verification steps to run after connecting |
| `docs/APP-AUDIT.md` | Per-app page cost, ranked, with what to remove and what it buys |
| `docs/CHANGES.md` | Every file touched and why, including what was deliberately left alone |

---

## One thing to set in Shopify admin

Customize → **Theme settings → SEO → Logo for search results**. Without it, the `Organization`
structured data ships without a logo. It's the only change I couldn't make from the code.
