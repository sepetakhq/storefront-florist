import { Link } from 'react-router-dom';

import { useCart } from '@sepetakhq/storefront-kit/cart/CartProvider';
import { isPriceRange, lineKey } from '@sepetakhq/storefront-kit/lib/variants';
import { useToast } from '@sepetakhq/storefront-kit/ui/ToastProvider';
import { fmt, formatQty } from '@sepetakhq/storefront-kit/shared/format';
import { qtyLimits, stepQty } from '@sepetakhq/storefront-kit/shared/qty';

import { Img, SIZES } from '../ui/Img.jsx';
import Icon from '../ui/Icon.jsx';
import { Tile } from './Tile.jsx';
import { cardNote, cardVeil, discountPct, quickAddState } from '../lib/copy.js';

/**
 * The design's card: a square picture (or initials) with the merchant's badge
 * in one corner and the discount in the other, then the category in small
 * caps, the name in capitals, the price and the note, and the round action at
 * the end of the row. The picture and the name are links; the action sits
 * outside them so a tap on it never navigates.
 */
export default function ProductCard({ p }) {
  const off = discountPct(p);
  const note = cardNote(p);
  const veil = cardVeil(p);
  const href = `/produk/${p.slug}`;

  return (
    <article className="fl-card" data-testid="product-card">
      <Link to={href} className="fl-card-media" tabIndex={-1} aria-hidden="true">
        <Img
          src={p.image}
          srcSet={p.image_srcset}
          sizes={SIZES.card}
          alt=""
          ratio="1/1"
          radius={0}
          fallback={<Tile label={p.name} tintKey={p.category_key} size={26} />}
        />
        {p.badge && <span className="fl-tag fl-tag-badge">{p.badge}</span>}
        {off > 0 && <span className="fl-tag fl-tag-sale">−{off}%</span>}
        {veil && (
          <span className="fl-card-veil">
            <span>{veil}</span>
          </span>
        )}
      </Link>
      <div className="fl-card-body">
        <div className="fl-card-info">
          {p.category_label && <span className="fl-card-cat">{p.category_label}</span>}
          <Link to={href} className="fl-card-name">
            {p.name}
          </Link>
          <Price p={p} off={off} />
          {note && <span className="fl-card-note">{note}</span>}
        </div>
        <QuickAdd p={p} />
      </div>
    </article>
  );
}

function Price({ p, off }) {
  return (
    <div className="fl-card-price">
      <span className="fl-price">
        {isPriceRange(p) && <span className="fl-price-from">mulai </span>}
        {fmt(p.price)}
      </span>
      {off > 0 && <s className="fl-compare">{fmt(p.compare_at_price)}</s>}
    </div>
  );
}

/**
 * The action, by quickAddState:
 *   add      → the round + adds one and confirms with a toast
 *   stepper  → −/+ around the qty already in the cart, + capped at `max`
 *   variants → the round arrow opens the page; a card cannot pick a variant
 *   disabled → nothing; the picture's veil already says why
 */
export function QuickAdd({ p }) {
  const cart = useCart();
  // The kit's context value is the function itself, not an object holding it.
  const showToast = useToast();
  const key = lineKey({ productId: p.id, variantId: null });
  const line = cart.items.find((it) => lineKey(it) === key);
  const qty = line?.qty ?? 0;
  const state = quickAddState(p, qty);

  if (state.kind === 'variants') {
    return (
      <Link to={`/produk/${p.slug}`} className="fl-card-act" aria-label={`Pilih varian ${p.name}`} title="Pilih varian">
        <Icon name="arrow" size={16} strokeWidth={2} />
      </Link>
    );
  }
  if (state.kind === 'disabled') return null;
  if (state.kind === 'add') {
    const label = p.preorder ? 'Pre-order' : 'Tambah';
    return (
      <button
        type="button"
        className="fl-card-act"
        aria-label={`${label} ${p.name} ke keranjang`}
        title={`${label} ke keranjang`}
        onClick={() => {
          cart.add(p, 1, null);
          showToast(`${p.name} masuk keranjang`);
        }}
      >
        <Icon name="plus" size={16} strokeWidth={2.2} />
      </button>
    );
  }
  const limits = qtyLimits(p);
  return (
    <div className="fl-stepper" role="group" aria-label={`Jumlah ${p.name}`}>
      <button type="button" aria-label="Kurangi" onClick={() => { const n = stepQty(qty, -1, limits); return n === 0 ? cart.remove(key) : cart.setQty(key, n); }}>
        −
      </button>
      <output aria-live="polite">{formatQty(qty, limits.unit)}</output>
      <button type="button" aria-label="Tambah" disabled={stepQty(qty, 1, limits) > state.max} onClick={() => cart.setQty(key, stepQty(qty, 1, limits))}>
        +
      </button>
    </div>
  );
}
