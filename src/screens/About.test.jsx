import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

// The published Tentang sections; most tests have none.
const getPage = vi.fn();
vi.mock('@sepetakhq/storefront-kit/api/endpoints', () => ({ getPage: (...a) => getPage(...a) }));
beforeEach(() => {
  getPage.mockReset();
  getPage.mockResolvedValue({ sections: [] });
});

const config = { brand: {} };
vi.mock('@sepetakhq/storefront-kit/config/ConfigProvider', () => ({
  useConfig: () => config,
}));

const AboutScreen = (await import('./About.jsx')).default;
const About = () => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>
      <AboutScreen />
    </MemoryRouter>
  </QueryClientProvider>
);

function withBrand(brand) {
  config.brand = { heroImages: [], ...brand };
}

describe('About', () => {
  it('renders the merchant’s story, one paragraph per blank line', () => {
    withBrand({ aboutTitle: 'Lily Alora', aboutBody: 'Satu.\n\nDua.' });
    render(<About />);

    expect(screen.getByRole('heading', { name: 'Lily Alora' })).toBeTruthy();
    expect(screen.getByText('Satu.')).toBeTruthy();
    expect(screen.getByText('Dua.')).toBeTruthy();
  });

  // The heading and the shop's name are the same string for most shops, so a
  // merchant who left the title empty gets their name, not an empty h1.
  it('falls back to the wordmark for the heading', () => {
    withBrand({ aboutTitle: '', wordmark_primary: 'Lily', wordmark_accent: 'Alora' });
    render(<About />);

    expect(screen.getByRole('heading', { name: 'Lily Alora' })).toBeTruthy();
  });

  // An empty story renders nothing rather than one empty paragraph, which
  // would leave a gap above the contact box with no explanation.
  it('renders no paragraphs for an empty story', () => {
    withBrand({ aboutTitle: 'Lily Alora', aboutBody: '' });
    const { container } = render(<About />);

    expect(container.querySelectorAll('p').length).toBe(0);
    expect(screen.getByRole('heading', { name: 'Lily Alora' })).toBeTruthy();
  });

  // The body is copy a merchant typed into the backoffice. The shortest path
  // from "let them use bold" to "let them inject a script" runs through this
  // element, so the markup has to arrive as text.
  it('renders the story as text, never as markup', () => {
    withBrand({
      aboutTitle: 'Lily Alora',
      aboutBody: '<img src=x onerror="alert(1)"><b>tebal</b>',
    });
    const { container } = render(<About />);

    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('<img src=x onerror="alert(1)"><b>tebal</b>')).toBeTruthy();
  });

  // The portrait arrives already resolved: the API substitutes the borrowed
  // hero, so this page never reaches into heroImages itself.
  it('renders the portrait the API resolved', () => {
    withBrand({
      aboutTitle: 'Lily Alora',
      aboutImage: { url: 'https://cdn.test/portrait.jpg', srcset: '', alt: 'Pendiri' },
      // Present and deliberately different: picking this one would mean the
      // fallback had crept back into the frontend.
      heroImages: [{ url: 'https://cdn.test/hero.jpg', alt: 'hero' }],
    });
    render(<About />);

    const img = screen.getByAltText('Pendiri');
    expect(img.getAttribute('src')).toBe('https://cdn.test/portrait.jpg');
  });

  // A tenant with no heroes and no portrait. Img renders its placeholder;
  // nothing here may throw reaching into an empty list.
  it('survives a tenant with no portrait at all', () => {
    withBrand({ aboutTitle: 'Lily Alora', aboutImage: null, heroImages: [] });
    expect(() => render(<About />)).not.toThrow();
  });

  // The page is called what the shop's nav calls it; with no nav entry, the
  // story button's label (the way buyers reach it from the home page).
  it('names the page the way the shop does', () => {
    withBrand({ aboutTitle: 'Toko Lain', nav: [{ path: '/tentang', label: 'Cerita Kami' }] });
    render(<About />);
    expect(screen.getByRole('main', { name: 'Cerita Kami' })).toBeTruthy();
    // The nav name is the breadcrumb; the heading stays the about title.
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toContain('Cerita Kami');
    expect(screen.getByRole('heading', { level: 1, name: 'Toko Lain' })).toBeTruthy();
    cleanup();
    withBrand({ aboutTitle: 'Toko Lain', sections: { story_cta: 'Kenali kami lebih dekat' } });
    render(<About />);
    expect(screen.getByRole('main', { name: 'Kenali kami lebih dekat' })).toBeTruthy();
  });

  it('links the phone and email, and offers no chat without a safe WhatsApp URL', () => {
    withBrand({ aboutTitle: 'Toko', phone: '0812-3456', email: 'a@b.test', whatsapp_url: 'javascript:alert(1)' });
    render(<About />);
    expect(screen.getByRole('link', { name: '0812-3456' }).getAttribute('href')).toBe('tel:08123456');
    expect(screen.getByRole('link', { name: 'a@b.test' }).getAttribute('href')).toBe('mailto:a@b.test');
    expect(document.querySelector('a[href^="javascript"]')).toBeNull();
  });

  it('draws a contact card only for what the merchant filled in', () => {
    withBrand({ aboutTitle: 'Ayuna', opening_hours: 'Senin–Sabtu', phone: '0812' });
    render(<About />);
    expect(screen.getByText('Jam operasional')).toBeTruthy();
    expect(screen.getByText('Hubungi kami')).toBeTruthy();
    expect(screen.queryByText('Alamat toko')).toBeNull();
    cleanup();
    withBrand({ aboutTitle: 'Ayuna' });
    render(<About />);
    expect(screen.queryByText('Jam operasional')).toBeNull();
  });

  it('titles the cards and the WhatsApp button with the shop\'s words, else its own', () => {
    withBrand({
      aboutTitle: 'Ayuna', address_line1: 'Jl. Riau 18', opening_hours: 'Senin–Sabtu', phone: '0812',
      whatsapp_url: 'https://wa.me/628', whatsapp_text: 'Chat admin',
      sections: { about_address_heading: 'Lokasi', about_hours_heading: ' ', about_contact_heading: 'Telepon' },
    });
    render(<About />);
    expect(screen.getByText('Lokasi')).toBeTruthy();
    expect(screen.getByText('Jam operasional')).toBeTruthy();
    expect(screen.getByText('Telepon')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Chat admin' })).toBeTruthy();
  });

  // A link out, never an embedded map: no third-party frame on the shop's page.
  it('links the address to the map, and embeds nothing', () => {
    withBrand({ aboutTitle: 'Toko', address_line1: 'Jl. Contoh 1', address_line2: 'Kota 123' });
    const { container } = render(<About />);
    expect(screen.getByText('Jl. Contoh 1')).toBeTruthy();
    const maps = screen.getByRole('link', { name: 'Buka di Maps' });
    expect(maps.getAttribute('href')).toBe('https://www.google.com/maps/search/?api=1&query=Jl.%20Contoh%201%2C%20Kota%20123');
    expect(maps.getAttribute('rel')).toContain('noopener');
    expect(container.querySelector('iframe')).toBeNull();
    cleanup();
    withBrand({ aboutTitle: 'Toko' });
    render(<About />);
    expect(screen.queryByRole('link', { name: 'Buka di Maps' })).toBeNull();
  });

  it('words the WhatsApp button with the contact heading when the shop set no button text', () => {
    withBrand({ aboutTitle: 'Toko', whatsapp_url: 'https://wa.me/628', sections: { about_contact_heading: 'Ngobrol yuk' } });
    render(<About />);
    expect(screen.getByRole('link', { name: 'Ngobrol yuk' }).getAttribute('href')).toBe('https://wa.me/628');
    cleanup();
    withBrand({ aboutTitle: 'Toko', whatsapp_url: 'https://wa.me/628' });
    render(<About />);
    expect(screen.getByRole('link', { name: 'Hubungi kami' })).toBeTruthy();
  });

  it('draws no portrait without one', () => {
    withBrand({ aboutTitle: 'Toko', aboutImage: { url: '', alt: 'Kosong' } });
    const { container } = render(<About />);
    expect(container.querySelector('.fl-about-media')).toBeNull();
  });

  it('draws the sections published on the Tentang page after the brand text', async () => {
    getPage.mockResolvedValue({
      sections: [{ id: 'f', type: 'features', features: { title: 'Kenapa kami', items: [{ mark: '', title: 'Segar tiap hari' }] } }],
    });
    withBrand({ aboutTitle: 'Toko', aboutBody: 'Cerita toko.' });
    render(<About />);
    const feature = await screen.findByText('Segar tiap hari');
    expect(getPage).toHaveBeenCalledWith('about', expect.anything());
    const story = screen.getByText('Cerita toko.');
    expect(story.compareDocumentPosition(feature) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Kenapa kami' })).toBeTruthy();
  });

  it('treats a 404 from the page as no sections: the brand text alone, no error', async () => {
    getPage.mockRejectedValue(Object.assign(new Error('not found'), { status: 404 }));
    withBrand({ aboutTitle: 'Toko', aboutBody: 'Cerita toko.' });
    const { container } = render(<About />);
    await vi.waitFor(() => expect(getPage).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole('heading', { level: 1, name: 'Toko' })).toBeTruthy();
    expect(screen.getByText('Cerita toko.')).toBeTruthy();
    expect(container.querySelectorAll('main > section')).toHaveLength(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
