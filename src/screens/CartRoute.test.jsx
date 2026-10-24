import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

// An empty cart is enough for the notice: it sits above whatever the cart
// holds. Mutated, not re-mocked, for the tests that need a line.
let cart = { isEmpty: true };
let lines = [];
vi.mock('@sepetakhq/storefront-kit/cart/CartProvider', () => ({ useCart: () => cart }));
vi.mock('@sepetakhq/storefront-kit/cart/useCartLines', () => ({
  useCartLines: () => ({ lines, statuses: [], subtotal: 0, isLoading: false, hasBlockers: false, preorderLeadDays: 0 }),
}));
vi.mock('@sepetakhq/storefront-kit/config/ConfigProvider', () => ({ useConfig: () => ({ freeShipping: false }) }));

const { default: CartRoute } = await import('./CartRoute.jsx');
const { stockNotice } = await import('../lib/copy.js');
const { qtyLimits } = await import('@sepetakhq/storefront-kit/shared/qty');

afterEach(cleanup);

function visit(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/keranjang', state }]}>
      <CartRoute />
    </MemoryRouter>,
  );
}

describe('CartRoute', () => {
  it('says why checkout sent the buyer back when stock changed', () => {
    visit({ stockChanged: true });
    expect(screen.getByRole('status').textContent).toBe(stockNotice({ stockChanged: true }));
  });

  it('words it differently when the code was already verified', () => {
    visit({ stockChanged: true, afterVerify: true });
    expect(screen.getByRole('status').textContent).toBe(stockNotice({ stockChanged: true, afterVerify: true }));
  });

  it('says nothing on an ordinary visit', () => {
    visit(undefined);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Keranjangmu masih kosong')).toBeTruthy();
  });
});

describe('CartRoute sale units', () => {
  afterEach(() => {
    cart = { isEmpty: true };
    lines = [];
  });

  function withLine(product, qty) {
    const calls = [];
    cart = { isEmpty: false, setQty: (...a) => calls.push(['setQty', ...a]), remove: (...a) => calls.push(['remove', ...a]) };
    lines = [{ key: 'p1', item: { product_id: 'p1', qty }, product: { id: 'p1', slug: 'p1', name: 'Produk', price: 80000, ...product }, status: 'ok', available: 5000, limits: qtyLimits(product), lineTotal: 1 }];
    visit(undefined);
    return calls;
  }

  it('prints a kg line in kg and steps it by qty_step', () => {
    const calls = withLine({ unit: 'kg', qty_step: 100, qty_min: 500 }, 1250);
    expect(screen.getByText('1,25 kg')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tambah jumlah' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kurangi jumlah' }));
    expect(calls).toEqual([['setQty', 'p1', 1350], ['setQty', 'p1', 1150]]);
  });

  it('removes the line when minus goes under the minimum', () => {
    const calls = withLine({ unit: 'kg', qty_step: 100, qty_min: 500 }, 500);
    fireEvent.click(screen.getByRole('button', { name: 'Kurangi jumlah' }));
    expect(calls).toEqual([['remove', 'p1']]);
  });

  it('keeps a pcs line a bare count', () => {
    withLine({}, 2);
    expect(screen.getByText('2')).toBeTruthy();
  });
});
