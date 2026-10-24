// The decisions behind this template's chrome, kept pure so they can be
// tested without a DOM. The kit owns the platform rules (stock, sale
// windows, variants); this file owns what this template does with them.

import { saleState, overlayLabel, AVAILABLE } from '@sepetakhq/storefront-kit/lib/availability';
import { countsStock, isSoldOut, leadDays, maxQty, shortNote } from '@sepetakhq/storefront-kit/lib/preorder';
import { fmt, formatQty } from '@sepetakhq/storefront-kit/shared/format';
import { unitScale } from '@sepetakhq/storefront-kit/shared/qty';
import { NAV_ROUTES } from '@sepetakhq/storefront-kit/shared/navRoutes';

/**
 * Percent off, or 0 when there is nothing honest to say: no compare price,
 * a compare price at or under the sale price, or a product not on sale.
 * Never divides by zero.
 */
export function discountPct(p) {
  const price = Number(p?.price ?? 0);
  const compare = Number(p?.compare_at_price ?? 0);
  if (!p?.on_sale || !(compare > 0) || !(compare > price)) return 0;
  return Math.round((1 - price / compare) * 100);
}

/** Two letters for a tile with no picture: "Serum Vitamin" → "SV", "Makeup" → "MA". */
export function initials(label) {
  const words = String(label ?? '')
    .split(/[\s&/·-]+/)
    .filter(Boolean);
  if (words.length === 0) return '·';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Six warm washes (sand, clay, linen...), keyed by a stable hash so the same
// category always gets the same one without the merchant choosing.
const TINTS = [1, 2, 3, 4, 5, 6].map((n) => `var(--fl-tint-${n})`);

export function tintFor(key) {
  const s = String(key ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

/**
 * What the card's action area shows for this product:
 *   variants  — a link to the page, never a variant-less line
 *   disabled  — sold out, scheduled or ended; the label is the kit's buyLabel
 *   stepper   — already in the cart; −/+ against `max`
 *   add       — one tap adds one
 */
export function quickAddState(p, lineQty = 0) {
  if (!p) return { kind: 'disabled', max: 0 };
  if (p.has_variants && !isSoldOut(p)) return { kind: 'variants', max: 0 };
  if (saleState(p) !== AVAILABLE || isSoldOut(p)) return { kind: 'disabled', max: 0 };
  const max = maxQty(p);
  return lineQty > 0 ? { kind: 'stepper', max } : { kind: 'add', max };
}

/**
 * The orange line under a card's name: the pre-order wait, or "only N left"
 * when a counted stock is nearly gone. Nothing otherwise.
 */
export const LOW_STOCK = 5; // in sale units: 5 pcs, 5 kg
export function cardNote(p) {
  if (!p) return '';
  if (p.preorder) return shortNote(p) || 'Pre-order';
  if (!countsStock(p) || isSoldOut(p) || saleState(p) !== AVAILABLE) return '';
  const n = Number(p.stock ?? 0);
  return n > 0 && n <= LOW_STOCK * unitScale(p.unit) ? `Sisa ${formatQty(n, p.unit)} lagi` : '';
}

/**
 * The product page's orange line, for the product as judged for the picked
 * variant: the pre-order wait, or a nearly-gone counted stock.
 */
export function detailNote(p) {
  if (!p) return '';
  if (p.preorder) {
    const days = leadDays(p);
    return days ? `Pre-order · dikirim ±${days} hari setelah pembayaran` : 'Pre-order · dibuat setelah pembayaran';
  }
  if (!countsStock(p) || isSoldOut(p)) return '';
  const n = Number(p.stock ?? 0);
  return n > 0 && n <= LOW_STOCK * unitScale(p.unit) ? `Sisa ${formatQty(n, p.unit)} lagi — segera checkout` : '';
}

/** "Pilih warna dulu" / "Pilih ukuran & warna dulu", for the axes still open. */
export function pickPrompt(options, selected) {
  const open = (options ?? []).map((o) => o.name).filter((n) => !selected?.[n]);
  return open.length ? `Pilih ${open.map((n) => n.toLowerCase()).join(' & ')} dulu` : 'Pilih varian dulu';
}

/**
 * The veil over a card's picture when it cannot be bought now, in the
 * design's sentence case: sold out, opening later, or closed.
 */
export function cardVeil(p) {
  const o = overlayLabel(p);
  if (!o) return isSoldOut(p) ? 'Stok habis' : '';
  if (o.title === 'SEGERA') return o.detail ? `Buka ${o.detail}` : 'Segera hadir';
  if (o.title === 'SUDAH DITUTUP') return 'Penjualan ditutup';
  return 'Stok habis';
}

/**
 * A running campaign's countdown is worth drawing for a week out; beyond
 * that "43 HARI" is noise, not urgency.
 */
export const COUNTDOWN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export function showCountdown(endsAt, now = Date.now()) {
  if (!endsAt) return false;
  const t = new Date(endsAt).getTime();
  if (Number.isNaN(t)) return false;
  const left = t - now;
  return left > 0 && left <= COUNTDOWN_WINDOW_MS;
}

/**
 * The campaign's big line: what the promotion takes off, in the design's
 * words, or the merchant's title for a kind this template cannot phrase.
 */
export function campaignHeadline(c) {
  const own = String(c?.headline ?? '').trim();
  if (own) return own;
  const v = Number(c?.discount_value ?? 0);
  if (v > 0 && c?.discount_type === 'percentage') return `Diskon hingga ${v}%`;
  if (v > 0 && c?.discount_type === 'fixed') return `Hemat ${fmt(v)}`;
  return c?.title ?? '';
}

/**
 * The API's two banner tones (`butter`, `pink`: theme names, not colours) in
 * this template's palette: the light one is the design's peach band, the
 * second the sage band with light words. Anything this bundle predates gets
 * the light one, as the API defaults to butter.
 */
export function bannerTheme(name) {
  return { className: name === 'pink' ? 'fl-banner is-sage' : 'fl-banner is-peach', button: 'fl-btn fl-btn-accent' };
}

/**
 * What the cart page says when checkout sent the buyer back because stock
 * changed: before the order was drafted, or after the code was already
 * verified (no order was made either way). Empty for an ordinary visit.
 */
export function stockNotice(state) {
  if (!state?.stockChanged) return '';
  return state.afterVerify
    ? 'Pesanan belum dibuat karena stok berubah saat verifikasi. Periksa keranjangmu, lalu checkout lagi.'
    : 'Stok beberapa produk berubah. Periksa keranjangmu sebelum lanjut ke checkout.';
}

/** The three checkout steps the design names, in order. */
export const CHECKOUT_STEPS = ['Data', 'Verifikasi', 'Bayar'];

/** Each step's state for a buyer on step `current` (0-based). */
export function checkoutSteps(current) {
  return CHECKOUT_STEPS.map((label, i) => ({
    n: i + 1,
    label,
    state: i < current ? 'past' : i === current ? 'current' : 'todo',
  }));
}

/** How long each hero picture stays before the next one. */
export const HERO_INTERVAL_MS = 6000;

/** The hero pictures that can be drawn: the merchant's, in their order. */
export function heroSlides(images) {
  return (images ?? []).filter((im) => im?.url);
}

/** The picture after `i` of `n`, wrapping; 0 when there is nothing to rotate. */
export function nextSlide(i, n) {
  return n > 0 ? (i + 1) % n : 0;
}

/**
 * How a feature item's mark is drawn: exactly as the merchant typed it
 * (`{ text }`), and a heart when there is none. No table turns a mark into
 * something else: what the merchant typed in the editor is what the shop shows.
 */
export function featureMark(mark) {
  const m = String(mark ?? '').trim();
  return m ? { text: m } : { icon: 'heart' };
}

/**
 * The campaign's big line split for the design's accent: the part from the
 * discount figure on ("20%") is drawn in the accent colour. Only a
 * percentage the headline actually contains is split; anything else is one
 * plain line.
 */
export function headlineParts(c) {
  const text = campaignHeadline(c);
  const v = Number(c?.discount_value ?? 0);
  const at = v > 0 && c?.discount_type === 'percentage' ? text.indexOf(`${v}%`) : -1;
  return at >= 0 ? { pre: text.slice(0, at), accent: text.slice(at) } : { pre: text, accent: '' };
}

/**
 * A plain link that opens the shop's address in Google Maps -- a link, not an
 * embedded map, so the page loads no third-party frame. Empty when the shop
 * has no address.
 */
export function mapsLink(brand = {}) {
  const address = [brand.address_line1, brand.address_line2]
    .map((l) => String(l ?? '').trim())
    .filter(Boolean)
    .join(', ');
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';
}

/**
 * A category's material line as the design writes it ("Bahan · Kayu jati,
 * linen"): the merchant's own label and text. Nothing without the text.
 */
export function categorySpec(c) {
  const spec = String(c?.material_spec ?? '').trim();
  if (!spec) return '';
  const label = String(c?.spec_label ?? '').trim();
  return label ? `${label} · ${spec}` : spec;
}

/**
 * The footer's closing line: where the shop ships from, in the merchant's
 * words ("Dikirim dari Jakarta Selatan · Dibuat sesuai pesanan"). Nothing
 * when the shop has no origin city.
 */
export function originLine(brand = {}) {
  if (!brand.origin_city) return '';
  const sections = brand.sections;
  const note = sectionText(sections, 'origin_note');
  return `${sectionText(sections, 'origin_prefix')} ${brand.origin_city}${note ? ` · ${note}` : ''}`;
}

/**
 * The cart's progress towards free shipping. The caller only asks while the
 * offer is on; a zero threshold means every order qualifies.
 */
export function freeShippingProgress(subtotal, min) {
  const need = Math.max(0, Number(min ?? 0) - Number(subtotal ?? 0));
  const pct = min > 0 ? Math.min(100, Math.round((subtotal / min) * 100)) : 100;
  return { pct, text: need > 0 ? `Tambah ${fmt(need)} lagi untuk gratis ongkir` : 'Kamu dapat gratis ongkir!' };
}

/**
 * The template's own wording for every section_copy label it draws. The
 * merchant's text from the backoffice replaces each one; blank keeps these.
 */
export const DEFAULT_LABELS = {
  cats_heading: 'Belanja per ruangan',
  grid_see_all: 'Lihat semua produk',
  story_eyebrow: 'Cerita kami',
  story_cta: 'Baca selengkapnya',
  product_details_heading: 'Detail',
  product_care_heading: 'Perawatan',
  product_shipping_heading: 'Pengiriman',
  hero_secondary_cta: 'Cerita kami',
  campaign_cta: 'Lihat semua promo',
  related_heading: 'Mungkin kamu suka',
  product_ask_label: 'Tanya via WhatsApp',
  product_ask_message: 'Halo, saya mau tanya tentang {product}',
  promo_title: 'Promo',
  promo_subtitle: 'Produk yang sedang diskon',
  about_address_heading: 'Alamat toko',
  about_hours_heading: 'Jam operasional',
  about_contact_heading: 'Hubungi kami',
  footer_shop_heading: 'Belanja',
  footer_contact_heading: 'Kontak',
  footer_payment_heading: 'Pembayaran',
  footer_shipping_heading: 'Pengiriman',
  footer_categories_heading: 'Kategori',
  origin_prefix: 'Dikirim dari',
  origin_note: '',
  hero_chip_shipping: 'Gratis ongkir',
  hero_chip_shipping_note: 'min. {free_shipping_min}',
  hero_chip_couriers: 'Kurir terpercaya',
  hero_chip_payment: 'Pembayaran aman',
  countdown_label: 'Berakhir dalam',
};

/**
 * One label: the merchant's section_copy text, trimmed, else the template's.
 * `copy` is the config's substitution, for labels that may carry
 * {free_shipping_min}; a sentence it withholds falls back too, rather than
 * leaving the slot blank.
 */
export function sectionText(sections, key, copy) {
  const raw = String(sections?.[key] ?? '').trim();
  const text = raw && copy ? String(copy(raw) ?? '').trim() : raw;
  return text || DEFAULT_LABELS[key] || '';
}

/**
 * Whether the product page should add its own free-shipping line under the
 * merchant's shipping copy: only while the offer is on, and only when that
 * copy does not already state the threshold itself -- a buyer should not
 * read the same promise twice.
 */
export function addFreeShippingLine(rawShippingCopy, freeShipping) {
  return Boolean(freeShipping) && !String(rawShippingCopy ?? '').includes('{free_shipping_min}');
}

/** The WhatsApp question with {product} filled in; other braces stay as typed. */
export function askMessage(template, productName) {
  return String(template ?? '').replaceAll('{product}', String(productName ?? ''));
}

/**
 * The "ask about this product" link: the shop's WhatsApp URL with the
 * message set through URL, so a merchant URL that already carries a query
 * keeps it. Anything that is not an http(s) URL gives no link at all.
 */
export function askLink(whatsappUrl, message) {
  if (!whatsappUrl) return '';
  let url;
  try {
    url = new URL(whatsappUrl);
  } catch {
    return '';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
  if (message) url.searchParams.set('text', message);
  return url.toString();
}

/**
 * The footer's link column: the merchant's own nav, plus order tracking when
 * the nav leaves it out -- a buyer looking for a parcel scrolls to the footer.
 */
const TRACK = NAV_ROUTES.find((r) => r.value === 'track');
export function footerLinks(nav = []) {
  const links = (nav ?? []).filter((n) => n?.path && n?.label);
  // The kit's default name for the screen: a merchant who wants other words
  // adds it to the nav under them.
  return links.some((n) => n.path === TRACK.path) ? links : [...links, { path: TRACK.path, label: TRACK.label }];
}

/**
 * A courier by the name the shop gave it. An order carries only the code;
 * one the shop has since removed shows as the code, upper-cased, rather than
 * as nothing.
 */
export function courierName(couriers, code) {
  if (!code) return '';
  const hit = (couriers ?? []).find((c) => c?.code === code && c?.name);
  return hit ? hit.name : String(code).toUpperCase();
}

const SOCIAL_NAMES = { instagram: 'Instagram', whatsapp: 'WhatsApp', tiktok: 'TikTok', facebook: 'Facebook' };
/** A social kind as a word; one this bundle predates is capitalised as-is. */
export function socialLabel(kind) {
  const k = String(kind ?? '');
  return SOCIAL_NAMES[k] ?? (k ? k[0].toUpperCase() + k.slice(1) : '');
}

/** The catalogue heading for the active filters. */
export function catalogTitle({ cat, sale, q } = {}, categories = [], promoTitle = DEFAULT_LABELS.promo_title) {
  if (q) return `Hasil untuk “${q}”`;
  if (sale) return promoTitle;
  if (cat && cat !== 'Semua') {
    const found = categories.find((c) => c.key === cat);
    return found?.label ?? cat;
  }
  return 'Semua produk';
}

/**
 * The chip row under the catalogue heading: all, each category, promo. A
 * chip is a link to that one filter; the sort the buyer chose rides along.
 */
export function catalogChips(categories = [], { cat, sale, q } = {}, sort = 'featured', promoTitle = DEFAULT_LABELS.promo_title) {
  const href = (params) => {
    const qs = new URLSearchParams(params);
    if (sort && sort !== 'featured') qs.set('sort', sort);
    const s = qs.toString();
    return s ? `/katalog?${s}` : '/katalog';
  };
  const active = sale ? '__sale' : cat && cat !== 'Semua' ? cat : q ? '__q' : '__all';
  return [
    { key: '__all', label: 'Semua', to: href({}) },
    ...categories.map((c) => ({ key: c.key, label: c.label, to: href({ cat: c.key }) })),
    { key: '__sale', label: promoTitle, to: href({ sale: '1' }) },
  ].map((c) => ({ ...c, current: c.key === active }));
}

export const SORTS = [
  { value: 'featured', label: 'Paling relevan' },
  { value: 'priceAsc', label: 'Harga terendah' },
  { value: 'priceDesc', label: 'Harga tertinggi' },
  { value: 'nameAsc', label: 'Nama A–Z' },
];

export function sortOrDefault(value) {
  return SORTS.some((s) => s.value === value) ? value : 'featured';
}
