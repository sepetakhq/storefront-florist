# storefront-florist

The `florist` storefront template: a soft peach-and-sage look in DM Serif
Display and Jost for flower, plant and gift-hamper shops, with Indonesian copy,
built for any shop that picks it. Everything that is not a design — API
client, tenant config, cart, checkout state, the helpers that decide what a
page may say — comes from
[`@sepetakhq/storefront-kit`](https://www.npmjs.com/package/@sepetakhq/storefront-kit).
Forked from `storefront-homeware`, so checkout, the order page and every
payment panel behave the same.

Nothing about a merchant is in here. Name, nav, hero pictures, features,
categories, campaign, story, contact, payment methods and couriers all arrive
from `/storefront/config` and `/storefront/home`; the About page adds the
sections the merchant published on the backoffice's **Tentang** page
(`/storefront/page/about`, 404 → brand text only). A product or category
without a picture renders as a two-letter tile, and an empty hero slot as the
design's line flower.

## Develop

Run the platform API first (`make up && make seed && make api` in the
`lilyalora` checkout; the seed installs the *Kembangkita* demo tenant on this
template), then:

```
npm install
npm run dev          # http://florist.localhost:5189, /api proxied to the API on :8090
```

Open it on `florist.localhost`, not `localhost`: the API resolves the shop
from the Host header. `API_TARGET` and `DEV_PORT` override the proxy target
and port.

## Ship

`public/manifest.json` and `public/preview.jpg` are this template's catalogue
entry; `src/manifest.test.js` refuses a push without them. Every push to
`main` builds and uploads to the template registry
(`.github/workflows/release.yml`). To see the registry path locally:

```
npm run publish:local
open http://florist.localhost:8090/
```

(The dev MinIO must list `http://florist.localhost:8090` in
`MINIO_API_CORS_ALLOW_ORIGIN`, and its container must have been recreated
since, or the page is blank.)

## Rules

- Serve exactly the kit's `ROUTE_CONTRACT` (`src/routes.test.js` pins it).
  The design's shop and collection pages are `/katalog` (`?cat=`, `?sale=1`,
  `?q=`, `?sort=` with the API's `featured|priceAsc|priceDesc|nameAsc`), and
  its contact page is part of `/tentang`.
- Keep the `<!--seo:start-->` / `<!--seo:end-->` markers in `index.html`.
- Every colour is a `--fl-*` token in `src/styles.css`; no colour literal,
  demo-shop string or undefined token anywhere else, and `index.html`'s
  theme-color stays equal to `--fl-surface`. `src/no-hardcode.test.js`
  enforces all four.
- Branch on `payment.kind`, render `order.timeline` and `status_label`.
- Draw what the backend sends, as sent. Every label a merchant might change
  is a `section_copy` key read through `sectionText`, and `DEFAULT_LABELS` is
  only the fallback for a blank one. A feature `mark` shows exactly as typed:
  the design's mark-to-icon table was dropped on purpose. Never add a table
  that turns merchant input into something else, and never add to the kit for
  this template's sake (rule 11 in the platform's CLAUDE.md).
- No wishlist (the platform has none) and no embedded map: the address links
  out to Google Maps.
- The API's banner `bg` is a theme name: `pink` is the sage band, anything
  else the peach band (`bannerTheme`). `hero.em` is text after the title, on
  its own line in the accent colour. The hero rotates the shop's hero pictures
  every 6 s, never under reduced motion.
- The template's own decisions live in `src/lib/copy.js` as pure functions
  with tests.
