import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const config = { brand: { nav: [], heroImages: [], heroStats: [], sections: {} } };
vi.mock('@sepetakhq/storefront-kit/config/ConfigProvider', () => ({ useConfig: () => config }));

const home = { data: { sections: [] }, isPending: false, isError: false };
vi.mock('@sepetakhq/storefront-kit/hooks/queries', () => ({ useHome: () => home }));

const cart = { items: [], add: vi.fn(), setQty: vi.fn(), remove: vi.fn() };
vi.mock('@sepetakhq/storefront-kit/cart/CartProvider', () => ({ useCart: () => cart }));
vi.mock('@sepetakhq/storefront-kit/ui/ToastProvider', () => ({ useToast: () => vi.fn() }));

const { default: HomeRoute, RAIL_ARROWS_AFTER, CAMPAIGN_CARDS, Sections, renders } = await import('./HomeRoute.jsx');
const { HERO_INTERVAL_MS } = await import('../lib/copy.js');

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete window.matchMedia;
});

function setup(sections, brand = {}, rest = {}) {
  Object.assign(config, { freeShipping: false, freeShippingMinLabel: '', paymentMethods: [], couriers: [], ...rest });
  config.copy = (s) => (config.freeShipping ? String(s).replaceAll('{free_shipping_min}', config.freeShippingMinLabel) : '');
  config.brand = { nav: [], heroImages: [], heroStats: [], sections: {}, ...brand };
  home.data = { sections };
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <HomeRoute />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const HERO = { id: 'h', type: 'hero', hero: { title: 'Rumah rapi.', em: 'Setiap hari.', sub: 'Sub.', cta: 'Belanja koleksi' } };
const CATS = {
  id: 'c',
  type: 'cats',
  cats: [
    { key: 'dapur', label: 'Dapur & Makan', subtitle: 'Keramik', spec_label: 'Bahan', material_spec: 'Stoneware' },
    { key: 'buket mawar', label: 'Buket', spec_label: 'Bunga', material_spec: 'Mawar' },
  ],
};
const product = (i) => ({ id: `p${i}`, slug: `p${i}`, name: `Produk ${i}`, price: 20000, stock: 20, availability: 'available' });
const PRODUCTS = [{ ...product(1), compare_at_price: 30000, on_sale: true }];
const grid = (products, title = 'Temuan terlaris', type = 'grid') => ({ id: `g-${title}`, type, grid: { title, products } });

describe('HomeRoute', () => {
  it('invites the buyer to the catalogue when nothing is published', () => {
    setup([]);
    expect(screen.getByText('Toko sedang disiapkan')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Lihat katalog' })).toBeTruthy();
    // Still the page's main landmark, so "skip to content" lands on it.
    expect(screen.getByRole('main')).toBeTruthy();
  });

  it('treats a page of empty or unknown sections as empty', () => {
    setup([{ id: 'x', type: 'video-hero' }, { id: 'f', type: 'features', features: { title: 'T', items: [] } }]);
    expect(screen.getByText('Toko sedang disiapkan')).toBeTruthy();
  });

  it('draws the hero title on two lines, the eyebrow and every number', () => {
    setup([HERO], { hero_eyebrow: 'Temuan terlaris', heroStats: [{ value: '10+', label: 'Tahun' }, { value: '50rb+', label: 'Rumah' }, { value: '', label: 'kosong' }] });
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.querySelector('span').textContent).toBe('Rumah rapi.');
    expect(h1.querySelector('em').textContent).toBe('Setiap hari.');
    expect(screen.getByText('Temuan terlaris')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Belanja koleksi' }).getAttribute('href')).toBe('/katalog');
    expect(screen.getByText('10+').closest('dl')).toBeTruthy();
    expect(screen.getByText('10+').tagName).toBe('DD');
    expect(screen.getByText('Rumah').tagName).toBe('DT');
    expect(screen.queryByText('kosong')).toBeNull();
  });

  it('draws no numbers row and no eyebrow for a shop without them', () => {
    const { container } = setup([HERO]);
    expect(container.querySelector('.fl-hero-stats')).toBeNull();
    expect(container.querySelector('.fl-eyebrow')).toBeNull();
  });

  it("sends the second hero button to order tracking, in the shop's words", () => {
    setup([HERO], { sections: { hero_secondary_cta: 'Lacak pesanan' } });
    expect(screen.getByRole('link', { name: 'Lacak pesanan' }).getAttribute('href')).toBe('/lacak');
    cleanup();
    setup([HERO]);
    expect(screen.getByRole('link', { name: 'Cerita kami' }).getAttribute('href')).toBe('/lacak');
  });

  it('falls back to its own words on the main hero button', () => {
    setup([{ ...HERO, hero: { title: 'Halo' } }]);
    expect(screen.getByRole('link', { name: 'Belanja sekarang' }).getAttribute('href')).toBe('/katalog');
    expect(screen.getByRole('heading', { level: 1 }).querySelector('em')).toBeNull();
  });

  describe('hero gallery', () => {
    const PICS = [
      { url: 'https://cdn.test/a.webp', alt: 'Mawar' },
      { url: '', alt: 'Kosong' },
      { url: 'https://cdn.test/b.webp', alt: 'Tulip' },
      { url: 'https://cdn.test/c.webp', alt: 'Lili' },
    ];
    const shown = (c) => c.querySelector('.fl-hero-media img')?.getAttribute('src');
    const dots = (c) => [...c.querySelectorAll('.fl-hero-dots button')];

    it('draws the empty picture when the shop uploaded none', () => {
      const { container } = setup([HERO]);
      expect(container.querySelector('.fl-hero-media img')).toBeNull();
      expect(container.querySelector('.fl-hero-media .fl-empty-picture')).toBeTruthy();
    });

    it('draws one picture without dots', () => {
      const { container } = setup([HERO], { heroImages: [PICS[0]] });
      expect(shown(container)).toBe('https://cdn.test/a.webp');
      expect(screen.queryByRole('group', { name: 'Foto' })).toBeNull();
    });

    it('offers a dot per drawable picture, pressed on the current one, and switches on a click', () => {
      const { container } = setup([HERO], { heroImages: PICS });
      expect(screen.getByRole('group', { name: 'Foto' })).toBeTruthy();
      expect(dots(container).map((d) => d.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
      expect(shown(container)).toBe('https://cdn.test/a.webp');
      fireEvent.click(screen.getByRole('button', { name: 'Lili' }));
      expect(shown(container)).toBe('https://cdn.test/c.webp');
      expect(screen.getByRole('button', { name: 'Lili' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('rotates on its own, wrapping round', () => {
      vi.useFakeTimers();
      const { container } = setup([HERO], { heroImages: PICS });
      act(() => vi.advanceTimersByTime(HERO_INTERVAL_MS));
      expect(shown(container)).toBe('https://cdn.test/b.webp');
      act(() => vi.advanceTimersByTime(HERO_INTERVAL_MS * 2));
      expect(shown(container)).toBe('https://cdn.test/a.webp');
    });

    it('stays still for a buyer who asked for reduced motion', () => {
      vi.useFakeTimers();
      window.matchMedia = vi.fn((q) => ({ matches: q === '(prefers-reduced-motion: reduce)', media: q }));
      const { container } = setup([HERO], { heroImages: PICS });
      act(() => vi.advanceTimersByTime(HERO_INTERVAL_MS * 2));
      expect(shown(container)).toBe('https://cdn.test/a.webp');
    });

    it('pauses while pointed at, and resumes after', () => {
      vi.useFakeTimers();
      const { container } = setup([HERO], { heroImages: PICS });
      fireEvent.mouseEnter(container.querySelector('.fl-hero-media'));
      act(() => vi.advanceTimersByTime(HERO_INTERVAL_MS * 2));
      expect(shown(container)).toBe('https://cdn.test/a.webp');
      fireEvent.mouseLeave(container.querySelector('.fl-hero-media'));
      act(() => vi.advanceTimersByTime(HERO_INTERVAL_MS));
      expect(shown(container)).toBe('https://cdn.test/b.webp');
    });
  });

  it('builds nothing about shipping on the home page itself: the trust strip is the layout’s', () => {
    const { container } = setup([HERO], {}, { freeShipping: true, freeShippingMinLabel: 'Rp 150.000' });
    expect(container.querySelector('.fl-trust')).toBeNull();
  });

  describe('features', () => {
    it('draws each mark as typed, and a heart for none', () => {
      const { container } = setup([
        { id: 'f', type: 'features', features: { title: 'Kenapa kami', items: [{ mark: '🌿', title: 'Alami', body: 'Kayu solid.' }, { mark: '24j', title: 'Cepat' }, { mark: '', title: 'Tanpa' }] } },
      ]);
      expect(screen.getByRole('region', { name: 'Kenapa kami' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Kenapa kami' })).toBeTruthy();
      expect(screen.getByText('🌿')).toBeTruthy();
      expect(screen.getByText('Kayu solid.')).toBeTruthy();
      expect(screen.getByText('24j')).toBeTruthy();
      expect(container.querySelectorAll('.fl-feature-mark svg')).toHaveLength(1);
    });

    it('draws no pictures, and tells the layout how many cards there are, eight at most', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ mark: `${i}`, title: `Butir ${i}` }));
      const { container } = setup([{ id: 'f', type: 'features', features: { title: '', items } }], { heroImages: [{ url: 'https://cdn.test/a.webp' }] });
      const list = container.querySelector('ul.fl-features');
      expect(list.getAttribute('data-n')).toBe('8');
      expect(list.querySelectorAll('li')).toHaveLength(8);
      expect(list.querySelector('img')).toBeNull();
      expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
      cleanup();
      const few = setup([{ id: 'f', type: 'features', features: { items: items.slice(0, 3) } }]);
      expect(few.container.querySelector('ul.fl-features').getAttribute('data-n')).toBe('3');
    });
  });

  it('links categories into the catalogue filter, with initials, the subtitle, else the material line', () => {
    setup([CATS]);
    expect(screen.getByRole('link', { name: /Dapur & Makan/ }).getAttribute('href')).toBe('/katalog?cat=dapur');
    expect(screen.getByRole('link', { name: /Buket/ }).getAttribute('href')).toBe('/katalog?cat=buket%20mawar');
    expect(screen.getByText('DM')).toBeTruthy();
    expect(screen.getByText('Keramik')).toBeTruthy();
    expect(screen.queryByText('Bahan · Stoneware')).toBeNull();
    expect(screen.getByText('Bunga · Mawar')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Belanja per ruangan' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Lihat semua produk' }).getAttribute('href')).toBe('/katalog');
  });

  it("titles the categories and their see-all in the shop's words", () => {
    setup([CATS], { sections: { cats_heading: 'Pilih bunga', grid_see_all: 'Semua bunga' } });
    expect(screen.getByRole('heading', { name: 'Pilih bunga' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Semua bunga' }).getAttribute('href')).toBe('/katalog');
  });

  describe('grid', () => {
    it('draws every product at once, with the see-all link', () => {
      const many = Array.from({ length: RAIL_ARROWS_AFTER + 3 }, (_, i) => product(i));
      setup([grid(many)], { tagline_short: 'Pilihan terbaik' });
      expect(screen.getByRole('heading', { name: 'Temuan terlaris' })).toBeTruthy();
      expect(screen.getAllByTestId('product-card')).toHaveLength(many.length);
      expect(screen.queryByRole('button', { name: 'Berikutnya' })).toBeNull();
      expect(screen.getByRole('link', { name: 'Lihat semua produk' }).getAttribute('href')).toBe('/katalog');
      // No chips and no tagline on the grid any more.
      expect(screen.queryByRole('group', { name: 'Kategori' })).toBeNull();
      expect(screen.queryByText('Pilihan terbaik')).toBeNull();
    });

    it('titles an untitled grid with its own words', () => {
      setup([grid(PRODUCTS, '')]);
      expect(screen.getByRole('heading', { name: 'Produk pilihan' })).toBeTruthy();
    });
  });

  it('gives the carousel arrows only once it holds more than fits', () => {
    const few = Array.from({ length: RAIL_ARROWS_AFTER }, (_, i) => product(i));
    setup([grid(few, 'Pilihan', 'carousel')]);
    expect(screen.queryByRole('button', { name: 'Berikutnya' })).toBeNull();
    cleanup();
    setup([grid([...few, product(9)], 'Pilihan', 'carousel')]);
    expect(screen.getByRole('button', { name: 'Berikutnya' })).toBeTruthy();
    expect(screen.getAllByTestId('product-card')).toHaveLength(RAIL_ARROWS_AFTER + 1);
  });

  it('skips an empty grid and renders a filled one', () => {
    setup([grid([], 'Kosong'), grid(PRODUCTS, 'Paling laris', 'carousel')]);
    expect(screen.queryByText('Kosong')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Paling laris' })).toBeTruthy();
  });

  describe('campaign', () => {
    const soon = () => new Date(Date.now() + 54 * 3600 * 1000).toISOString();

    it('leads with the headline, its percentage in the accent, the name under it and a countdown inside a week', () => {
      setup([{ id: 'c', type: 'campaign', campaign: { badge: 'Promo terbatas', title: 'untuk koleksi terlaris', headline: 'Diskon hingga 20%', discount_type: 'percentage', discount_value: 20, ends_at: soon(), products: PRODUCTS } }]);
      expect(screen.getByText('Promo terbatas')).toBeTruthy();
      const h2 = screen.getByRole('heading', { name: 'Diskon hingga 20%' });
      expect(h2.querySelector('em').textContent).toBe('20%');
      expect(screen.getByText('untuk koleksi terlaris')).toBeTruthy();
      expect(screen.getByRole('timer')).toBeTruthy();
      expect(screen.getByText('Berakhir dalam')).toBeTruthy();
      expect(screen.getByRole('link', { name: 'Lihat semua promo' }).getAttribute('href')).toBe('/katalog?sale=1');
      expect(screen.getByRole('link', { name: /Produk 1/ }).getAttribute('href')).toBe('/produk/p1');
    });

    it('does not split a headline without the percentage, and draws no countdown far off', () => {
      const far = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
      setup([{ id: 'c', type: 'campaign', campaign: { title: 'Akhir bulan', headline: 'Hemat besar', discount_type: 'percentage', discount_value: 20, ends_at: far, products: PRODUCTS } }]);
      expect(screen.getByRole('heading', { name: 'Hemat besar' }).querySelector('em')).toBeNull();
      expect(screen.queryByRole('timer')).toBeNull();
    });

    // A promotion with no end date must not draw 00:00:00:00.
    it('phrases a campaign with no headline, and draws no countdown and no button without an end or products', () => {
      setup([{ id: 'c', type: 'campaign', campaign: { title: '', discount_type: 'percentage', discount_value: 30, ends_at: null, products: [] } }]);
      expect(screen.queryByRole('timer')).toBeNull();
      expect(screen.queryByText(/Berakhir dalam/)).toBeNull();
      expect(screen.getByRole('heading', { name: 'Diskon hingga 30%' })).toBeTruthy();
      expect(screen.queryByRole('link', { name: 'Lihat semua promo' })).toBeNull();
    });

    it('draws at most CAMPAIGN_CARDS of its products', () => {
      const many = Array.from({ length: CAMPAIGN_CARDS + 2 }, (_, i) => product(i));
      setup([{ id: 'c', type: 'campaign', campaign: { headline: 'Diskon', products: many } }]);
      expect(CAMPAIGN_CARDS).toBe(4);
      expect(screen.getAllByTestId('product-card')).toHaveLength(CAMPAIGN_CARDS);
    });

    it('draws no name under a headline that says the same thing', () => {
      const { container } = setup([{ id: 'c', type: 'campaign', campaign: { title: 'Diskon hingga 30%', discount_type: 'percentage', discount_value: 30, products: [] } }]);
      expect(container.querySelector('.fl-campaign-sub')).toBeNull();
    });

    it("uses the shop's labels", () => {
      setup([{ id: 'c', type: 'campaign', campaign: { headline: 'Diskon', ends_at: new Date(Date.now() + 5 * 3600 * 1000).toISOString(), products: PRODUCTS } }], {
        sections: { campaign_cta: 'Ambil promonya', countdown_label: 'Sisa waktu' },
      });
      expect(screen.getByRole('link', { name: 'Ambil promonya' })).toBeTruthy();
      expect(screen.getByText('Sisa waktu')).toBeTruthy();
      expect(screen.queryByText('Berakhir dalam')).toBeNull();
    });
  });

  it('sends the story to the about page, with the portrait only when the shop has one', () => {
    const { container } = setup([{ id: 's', type: 'story', story: { title: 'Sejak 2019', text: 'Kami mulai kecil.' } }], {
      sections: { story_eyebrow: 'Cerita kami', story_cta: 'Kenali kami' },
    });
    expect(screen.getByText('Cerita kami')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Kenali kami' }).getAttribute('href')).toBe('/tentang');
    expect(container.querySelector('.fl-story-media')).toBeNull();
    cleanup();
    const withPortrait = setup([{ id: 's', type: 'story', story: { title: 'Sejak 2019' } }], { aboutImage: { url: 'https://cdn.test/p.webp', alt: 'Toko' } });
    expect(withPortrait.container.querySelector('.fl-story-media img').getAttribute('src')).toBe('https://cdn.test/p.webp');
  });

  it('maps the banner tone names to its two bands, with the gift, and links the catalogue', () => {
    const { container } = setup([{ id: 'b', type: 'banner', banner: { text: 'Cari hadiah?', cta: 'Belanja', bg: 'pink' } }]);
    expect(container.querySelector('.fl-banner.is-sage')).toBeTruthy();
    expect(container.querySelector('.fl-banner-text svg')).toBeTruthy();
    const cta = screen.getByRole('link', { name: 'Belanja' });
    expect(cta.getAttribute('href')).toBe('/katalog');
    expect(cta.className).toBe('fl-btn fl-btn-accent');
    cleanup();
    const quiet = setup([{ id: 'b', type: 'banner', banner: { text: 'Halo', bg: 'butter' } }]);
    expect(quiet.container.querySelector('.fl-banner.is-peach')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('Sections draws only what renders() accepts, in order', () => {
    expect(renders({ type: 'banner', banner: { text: '' } })).toBe(false);
    expect(renders({ type: 'video-hero' })).toBe(false);
    expect(renders(undefined)).toBe(false);
    expect(renders({ type: 'story', story: { title: 'x' } })).toBe(true);
    config.brand = { sections: {} };
    const { container } = render(
      <MemoryRouter>
        <Sections
          sections={[
            { id: 'x', type: 'video-hero' },
            { id: 'e', type: 'features', features: { items: [] } },
            { id: 'b', type: 'banner', banner: { text: 'Satu' } },
            { id: 's', type: 'story', story: { title: 'Dua' } },
          ]}
        />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('section')).toHaveLength(2);
    expect(container.textContent.indexOf('Satu')).toBeLessThan(container.textContent.indexOf('Dua'));
  });
});
