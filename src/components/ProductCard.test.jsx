import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The cart and the toast are mocked so the card's decisions are what is
// asserted, not the provider plumbing the kit already tests.
const cart = { items: [], add: vi.fn(), setQty: vi.fn(), remove: vi.fn() };
vi.mock('@sepetakhq/storefront-kit/cart/CartProvider', () => ({ useCart: () => cart }));
// The kit's useToast returns the show function itself; mocking it as an
// object is how a card that threw on every quick-add once passed here.
const toast = { showToast: vi.fn() };
vi.mock('@sepetakhq/storefront-kit/ui/ToastProvider', () => ({ useToast: () => toast.showToast }));

const ProductCard = (await import('./ProductCard.jsx')).default;

afterEach(cleanup);
beforeEach(() => {
  cart.items = [];
  cart.add.mockClear();
  cart.setQty.mockClear();
  cart.remove.mockClear();
});

function product(over) {
  return {
    id: 'p1',
    slug: 'almond-panggang',
    name: 'Almond Panggang',
    category_key: 'kacang',
    category_label: 'Kacang & Biji',
    image: '',
    image_srcset: '',
    price: 132300,
    compare_at_price: 189000,
    on_sale: true,
    stock: 24,
    availability: 'available',
    ...over,
  };
}

function card(p) {
  return render(
    <MemoryRouter>
      <ProductCard p={p} />
    </MemoryRouter>,
  );
}

describe('ProductCard', () => {
  it('shows the discount, the strike-through, the category and initials when there is no photo', () => {
    const { container } = card(product());
    const sale = container.querySelector('.fl-tag-sale');
    expect(sale.textContent).toBe('\u221230%');
    expect(screen.getByText('Rp 189.000').tagName).toBe('S');
    expect(screen.getByText('Kacang & Biji')).toBeTruthy();
    expect(screen.getByText('AP')).toBeTruthy();
    expect(container.querySelector('.fl-tag-badge')).toBeNull();
    // A healthy stock says nothing.
    expect(screen.queryByText(/Sisa/)).toBeNull();
  });

  it('puts the merchant badge in one corner and the discount in the other', () => {
    const { container } = card(product({ badge: 'Terlaris' }));
    expect(container.querySelector('.fl-tag-badge').textContent).toBe('Terlaris');
    expect(container.querySelector('.fl-tag-sale').textContent).toBe('\u221230%');
    expect(screen.getByText('Rp 189.000').tagName).toBe('S');
  });

  it('says nothing about a discount it cannot compute', () => {
    const { container } = card(product({ compare_at_price: 0 }));
    expect(container.querySelector('.fl-tag-sale')).toBeNull();
    expect(screen.queryByText('Rp 0')).toBeNull();
  });

  it('warns on a low counted stock', () => {
    card(product({ stock: 4 }));
    expect(screen.getByText('Sisa 4 lagi')).toBeTruthy();
  });

  it('adds one and confirms, then becomes a stepper', () => {
    const p = product();
    card(p);
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Almond Panggang ke keranjang' }));
    expect(cart.add).toHaveBeenCalledWith(p, 1, null);
    expect(toast.showToast).toHaveBeenCalled();

    cleanup();
    cart.items = [{ productId: 'p1', variantId: null, qty: 2 }];
    card(p);
    expect(screen.getByRole('group', { name: /Jumlah/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(cart.setQty).toHaveBeenCalledWith('p1:', 3);
    fireEvent.click(screen.getByRole('button', { name: 'Kurangi' }));
    expect(cart.setQty).toHaveBeenCalledWith('p1:', 1);
  });

  it('removes the line when stepping down from one, and caps + at the stock', () => {
    cart.items = [{ productId: 'p1', variantId: null, qty: 1 }];
    card(product({ stock: 1 }));
    expect(screen.getByRole('button', { name: 'Tambah' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Kurangi' }));
    expect(cart.remove).toHaveBeenCalledWith('p1:');
  });

  it('steps a kg line by qty_step, prints it in kg, and removes it under the minimum', () => {
    cart.items = [{ productId: 'p1', variantId: null, qty: 600 }];
    card(product({ unit: 'kg', qty_step: 100, qty_min: 500, stock: 5000 }));
    expect(screen.getByText('0,6 kg')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(cart.setQty).toHaveBeenCalledWith('p1:', 700);
    fireEvent.click(screen.getByRole('button', { name: 'Kurangi' }));
    expect(cart.setQty).toHaveBeenCalledWith('p1:', 500);
    cleanup();
    cart.items = [{ productId: 'p1', variantId: null, qty: 500 }];
    card(product({ unit: 'kg', qty_step: 100, qty_min: 500, stock: 5000 }));
    fireEvent.click(screen.getByRole('button', { name: 'Kurangi' }));
    expect(cart.remove).toHaveBeenCalledWith('p1:');
  });

  it('sends a variant product to its page instead of adding, priced from', () => {
    const { container } = card(product({ has_variants: true, price_max: 249000 }));
    const link = screen.getByRole('link', { name: 'Pilih varian Almond Panggang' });
    expect(link.getAttribute('href')).toBe('/produk/almond-panggang');
    expect(link.className).toBe('fl-card-act');
    expect(container.querySelector('.fl-price').textContent).toBe('mulai Rp 132.300');
    expect(container.querySelector('.fl-price').nextElementSibling.tagName).toBe('S');
    expect(screen.queryByRole('button', { name: /Tambah/ })).toBeNull();
  });

  it('offers no action for sold out, scheduled and ended; the veil says why', () => {
    const veil = (c) => c.querySelector('.fl-card-veil').textContent;
    let r = card(product({ sold_out: true, availability: 'sold_out' }));
    expect(veil(r.container)).toBe('Stok habis');
    expect(r.container.querySelector('.fl-card-act')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();
    r = card(product({ availability: 'ended' }));
    expect(veil(r.container)).toBe('Penjualan ditutup');
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();
    r = card(product({ availability: 'scheduled', sell_from: '2030-01-01T00:00:00Z' }));
    expect(veil(r.container)).toMatch(/^Buka /);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('a variant product with every variant gone cannot be picked either', () => {
    const { container } = card(product({ has_variants: true, sold_out: true, availability: 'sold_out' }));
    expect(screen.queryByRole('link', { name: /Pilih varian/ })).toBeNull();
    expect(container.querySelector('.fl-card-act')).toBeNull();
    expect(container.querySelector('.fl-card-veil').textContent).toBe('Stok habis');
  });

  it('marks a pre-order in the note and on the button', () => {
    card(product({ preorder: true, preorder_lead_days: 5 }));
    expect(screen.getByText('Pre-order · ±5 hari setelah pembayaran')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pre-order Almond Panggang ke keranjang' })).toBeTruthy();
    cleanup();
    card(product({ unlimited_stock: true, stock: 0 }));
    expect(screen.getByRole('button', { name: /^Tambah .+ ke keranjang$/ }).disabled).toBe(false);
  });

  it('never shows a variant line quantity on a variant-less card', () => {
    cart.items = [{ productId: 'p1', variantId: 'v9', qty: 4 }];
    card(product());
    expect(screen.getByRole('button', { name: /^Tambah .+ ke keranjang$/ })).toBeTruthy();
  });
});
