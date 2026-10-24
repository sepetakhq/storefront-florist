import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const config = {};
vi.mock('@sepetakhq/storefront-kit/config/ConfigProvider', () => ({ useConfig: () => config }));
let categories = [];
vi.mock('@sepetakhq/storefront-kit/hooks/queries', () => ({ useCategories: () => ({ data: categories }) }));

const Footer = (await import('./Footer.jsx')).default;

afterEach(cleanup);

function setup(brand = {}, { cats = [{ key: 'dapur', label: 'Dapur' }], payments, couriers } = {}) {
  categories = cats;
  Object.assign(config, {
    paymentMethods: payments ?? [{ code: 'QRIS', name: 'QRIS', enabled: true }, { code: 'OFF', name: 'Mati', enabled: false }],
    couriers: couriers ?? [{ code: 'jne', name: 'JNE REG', enabled: true }, { code: 'x', name: 'Kurir mati', enabled: false }],
    tenant: { name: 'Toko Contoh' },
    brand: {
      nav: [{ route: 'home', path: '/', label: 'Beranda' }],
      wordmark_primary: 'Toko',
      address_line1: 'Jl. Contoh 1',
      phone: '0812-0000',
      social_links: [{ kind: 'tiktok', url: 'https://tiktok.com/@a' }],
      copyright: '© Toko',
      sections: {},
      ...brand,
    },
  });
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe('Footer', () => {
  it('uses its own column titles when the shop set none, and only enabled payments and couriers', () => {
    setup();
    for (const t of ['Belanja', 'Kategori', 'Kontak']) expect(screen.getByRole('heading', { name: t })).toBeTruthy();
    expect(screen.getByText('Pembayaran')).toBeTruthy();
    expect(screen.getByText(/QRIS/)).toBeTruthy();
    expect(screen.queryByText(/Mati/)).toBeNull();
    expect(screen.getByText(/JNE REG/)).toBeTruthy();
    expect(screen.queryByText(/Kurir mati/)).toBeNull();
    // A social link is its kind, as a word.
    expect(screen.getByRole('link', { name: 'TikTok' }).getAttribute('href')).toBe('https://tiktok.com/@a');
  });

  it("draws the server's badge in place of a name, once per badge, and keeps names it has none for", () => {
    const bca = 'http://api.test/logos/payment/bca.svg';
    const jne = 'http://api.test/logos/courier/jne.svg';
    const { container } = setup({}, {
      payments: [
        { code: 'BCA', name: 'VA BCA', enabled: true, logo_url: bca },
        { code: 'MANUAL_BCA', name: 'Transfer BCA', enabled: true, logo_url: bca },
        { code: 'MANUAL_BANK_1', name: 'Transfer SeaBank', enabled: true },
      ],
      couriers: [
        { code: 'toko', name: 'Kurir Toko', enabled: true },
        { code: 'jne', name: 'JNE REG', enabled: true, logo_url: jne },
        { code: 'jne', name: 'JNE YES', enabled: true, logo_url: jne },
      ],
    });
    const imgs = [...container.querySelectorAll('.fl-logo-chip img')];
    expect(imgs.map((i) => i.getAttribute('src'))).toEqual([bca, jne]);
    // The first name behind a badge is how it is read aloud.
    expect(screen.getByRole('img', { name: 'VA BCA' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Transfer BCA' })).toBeNull();
    expect(screen.getByText('Transfer SeaBank')).toBeTruthy();
    expect(screen.getByText('Kurir Toko')).toBeTruthy();
  });

  it("uses the shop's column titles", () => {
    setup({ sections: { footer_shop_heading: 'Jelajah', footer_contact_heading: 'Hubungi', footer_payment_heading: 'Bayar', footer_shipping_heading: 'Kirim', footer_categories_heading: 'Ruangan' } });
    for (const t of ['Jelajah', 'Hubungi', 'Ruangan']) expect(screen.getByRole('heading', { name: t })).toBeTruthy();
    expect(screen.getByText('Bayar')).toBeTruthy();
    expect(screen.getByText('Kirim')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Belanja' })).toBeNull();
  });

  it('links only the merchant nav and order tracking', () => {
    setup();
    const menu = screen.getByRole('navigation', { name: 'Belanja' });
    expect([...menu.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/', '/lacak']);
    expect(screen.getByRole('link', { name: 'Dapur' }).getAttribute('href')).toBe('/katalog?cat=dapur');
    expect(screen.getByRole('link', { name: /0812-0000/ }).getAttribute('href')).toBe('tel:08120000');
  });

  it('draws no column for what the shop has not got', () => {
    setup({ nav: [], address_line1: '', phone: '', email: '', social_links: [], copyright: '' }, { cats: [], payments: [], couriers: [] });
    for (const t of ['Kategori', 'Kontak']) expect(screen.queryByRole('heading', { name: t })).toBeNull();
    expect(screen.queryByText('Pembayaran')).toBeNull();
    expect(screen.queryByText('Pengiriman')).toBeNull();
    // Tracking is never dropped: a buyer looking for a parcel scrolls here.
    expect(screen.getByRole('link', { name: 'Lacak Pesanan' })).toBeTruthy();
  });

  it('shows the copyright in the bottom row and no origin line any more', () => {
    const { container } = setup({ origin_city: 'Kota Contoh', sections: { origin_note: 'Dikemas kayu' } });
    expect(container.querySelector('.fl-footer-bottom').textContent).toBe('© Toko');
    expect(screen.queryByText(/Dikirim dari/)).toBeNull();
    expect(screen.getByText('Jl. Contoh 1')).toBeTruthy();
  });

  it('draws the short tagline, falling back to the tagline', () => {
    setup({ tagline: 'Panjang', tagline_short: 'Pendek' });
    expect(screen.getByText('Pendek')).toBeTruthy();
    expect(screen.queryByText('Panjang')).toBeNull();
    cleanup();
    setup({ tagline: 'Panjang', tagline_short: '' });
    expect(screen.getByText('Panjang')).toBeTruthy();
  });

  it('draws each social as a round icon link named by its kind, and no WhatsApp button', () => {
    const { container } = setup({
      whatsapp_url: 'https://wa.me/620000',
      whatsapp_text: 'Chat kami',
      social_links: [{ kind: 'instagram', url: 'https://instagram.com/a' }, { kind: 'facebook', url: '' }],
    });
    const ig = screen.getByRole('link', { name: 'Instagram' });
    expect(ig.getAttribute('href')).toBe('https://instagram.com/a');
    expect(ig.className).toBe('fl-social');
    expect(ig.querySelector('svg')).toBeTruthy();
    expect(container.querySelectorAll('.fl-social')).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'Chat kami' })).toBeNull();
  });

  // The platform's mark rides the plan. An older API version strips the
  // field, and then nothing is drawn.
  it('shows the Sepetak badge only when the shop carries it', () => {
    setup();
    expect(screen.queryByRole('link', { name: 'Dibuat dengan Sepetak' })).toBeNull();
    cleanup();
    config.tenant = { ...config.tenant, sepetak_badge: true };
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    const a = screen.getByRole('link', { name: 'Dibuat dengan Sepetak' });
    expect(a.getAttribute('href')).toBe('https://sepetak.com/?ref=toko');
    expect(a.getAttribute('target')).toBe('_blank');
    delete config.tenant;
  });
});
