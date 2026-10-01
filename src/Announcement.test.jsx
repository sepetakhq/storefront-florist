import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fmt, shippingCopy } from '@sepetakhq/storefront-kit/shared/format';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

// The bar reads the banner from the home query and the substitution rules from
// the config. Both are hooks, and both are the seam.
let home = { data: undefined };
let freeShipping = true;
let brand = {};

vi.mock('@sepetakhq/storefront-kit/hooks/queries', () => ({
  useHome: () => home,
  useProduct: () => ({ data: undefined }),
}));

vi.mock('@sepetakhq/storefront-kit/config/ConfigProvider', () => ({
  useConfig: () => ({
    brand,
    tenant: {},
    // The real provider's helper, wired the same way, so this test exercises
    // the actual withholding rule rather than a stand-in for it.
    copy: (s) => shippingCopy(s, { free_shipping_min: fmt(150000) }, freeShipping),
  }),
}));

const { Announcement } = await import('./RootLayout.jsx');

function show() {
  return render(
    <MemoryRouter>
      <Announcement />
    </MemoryRouter>,
  );
}

describe('Announcement', () => {
  it('renders the merchant’s banner', () => {
    home = { data: { announcement: { enabled: true, text: 'Koleksi perdana telah hadir' } } };
    show();

    expect(screen.getByText('Koleksi perdana telah hadir')).toBeTruthy();
  });

  it('renders nothing while the query is still resolving', () => {
    home = { data: undefined };
    const { container } = render(
      <MemoryRouter>
        <Announcement />
      </MemoryRouter>,
    );

    expect(container.textContent).toBe('');
  });

  it('renders nothing when the merchant switched it off', () => {
    home = { data: { announcement: { enabled: false, text: 'Koleksi perdana telah hadir' } } };
    const { container } = render(
      <MemoryRouter>
        <Announcement />
      </MemoryRouter>,
    );

    expect(container.textContent).toBe('');
  });

  // The bug this fixes: the seeded banner said "Rp 150.000" as a literal, so a
  // merchant who raised their threshold advertised the old one indefinitely.
  it('substitutes the shop’s actual free-shipping threshold', () => {
    freeShipping = true;
    home = {
      data: {
        announcement: { enabled: true, text: 'Gratis ongkir min {free_shipping_min}.' },
      },
    };
    show();

    expect(screen.getByText('Gratis ongkir min Rp 150.000.')).toBeTruthy();
  });

  // A bar promising free shipping the checkout would refuse is worse than no
  // bar. The sentence is withheld, and a banner that was only that sentence
  // therefore disappears -- which the backoffice hint has to warn about.
  it('withholds a free-shipping promise the shop no longer offers', () => {
    freeShipping = false;
    home = {
      data: {
        announcement: { enabled: true, text: 'Gratis ongkir min {free_shipping_min}.' },
      },
    };
    const { container } = render(
      <MemoryRouter>
        <Announcement />
      </MemoryRouter>,
    );

    expect(container.textContent).toBe('');
  });

  // The design's bar is the merchant's sentence and nothing else: with the
  // announcement off, the shop's city and hours do not keep an empty bar up
  // (they live in the footer).
  it('draws no bar without an announcement, whatever else the shop filled in', () => {
    freeShipping = true;
    brand = { origin_city: 'Bandung', opening_hours: 'Senin–Sabtu' };
    home = { data: { announcement: { enabled: false, text: 'x' } } };
    const { container } = show();
    expect(container.textContent).toBe('');
    brand = {};
  });

  // Copy that says nothing about shipping is unaffected either way.
  it('keeps the sentences that are not about shipping', () => {
    freeShipping = false;
    home = {
      data: {
        announcement: {
          enabled: true,
          text: 'Koleksi perdana telah hadir. Gratis ongkir min {free_shipping_min}.',
        },
      },
    };
    show();

    expect(screen.getByText('Koleksi perdana telah hadir.')).toBeTruthy();
  });

  it('links the sentence to the catalogue', () => {
    freeShipping = true;
    home = { data: { announcement: { enabled: true, text: 'Koleksi perdana telah hadir' } } };
    show();
    expect(screen.getByRole('link', { name: 'Koleksi perdana telah hadir' }).getAttribute('href')).toBe('/katalog');
  });

  it('closes for this tab, and shows again once the text changes', () => {
    freeShipping = true;
    home = { data: { announcement: { enabled: true, text: 'Promo pertama' } } };
    const { container } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Tutup pengumuman' }));
    expect(container.textContent).toBe('');
    expect(sessionStorage.getItem('fl_ann_closed')).toBe('Promo pertama');
    cleanup();

    // The same sentence stays closed on the next page.
    const again = show();
    expect(again.container.textContent).toBe('');
    cleanup();

    home = { data: { announcement: { enabled: true, text: 'Promo kedua' } } };
    show();
    expect(screen.getByText('Promo kedua')).toBeTruthy();
  });

  // The merchant edits the bar while a buyer has the page open: the next home
  // refetch brings a new sentence into the same mounted bar.
  it('shows a new sentence without a remount after the old one was closed', () => {
    freeShipping = true;
    home = { data: { announcement: { enabled: true, text: 'Promo pertama' } } };
    const view = show();
    fireEvent.click(screen.getByRole('button', { name: 'Tutup pengumuman' }));
    expect(view.container.textContent).toBe('');

    home = { data: { announcement: { enabled: true, text: 'Promo kedua' } } };
    view.rerender(
      <MemoryRouter>
        <Announcement />
      </MemoryRouter>,
    );
    expect(screen.getByText('Promo kedua')).toBeTruthy();
  });
});
