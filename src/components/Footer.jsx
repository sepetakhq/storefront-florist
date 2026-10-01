import { Link } from 'react-router-dom';

import { useConfig } from '@sepetakhq/storefront-kit/config/ConfigProvider';
import { useCategories } from '@sepetakhq/storefront-kit/hooks/queries';

import { BrandMark } from './BrandMark.jsx';
import Icon from '../ui/Icon.jsx';
import { footerLinks, sectionText, socialLabel } from '../lib/copy.js';

/**
 * The design's deep-green footer, from config alone: the mark, the short
 * tagline and the socials; the merchant's own links; the categories; contact;
 * and the payment methods and couriers the shop has switched on, as chips. A
 * column with nothing to list is not drawn, so a bare new shop gets a short
 * footer rather than headings over nothing.
 */
export default function Footer() {
  const { brand, paymentMethods, couriers } = useConfig();
  const { data: categories } = useCategories();
  const payments = (paymentMethods ?? []).filter((m) => m.enabled && m.name);
  const ships = (couriers ?? []).filter((c) => c.enabled && c.name);
  const socials = (brand.social_links ?? []).filter((s) => s.url);
  const links = footerLinks(brand.nav);
  const cats = categories ?? [];
  const address = [brand.address_line1, brand.address_line2].filter(Boolean);
  const phoneHref = brand.phone ? `tel:${String(brand.phone).replace(/[^\d+]/g, '')}` : '';
  const hasContact = Boolean(brand.phone || brand.email || address.length || brand.opening_hours);
  const tagline = brand.tagline_short || brand.tagline;
  const s = (key) => sectionText(brand.sections, key);

  return (
    <footer className="fl-footer">
      <div className="fl-footer-grid">
        <div className="fl-footer-col" style={{ gap: 14 }}>
          <Link to="/" aria-label="Beranda" style={{ alignSelf: 'flex-start' }}>
            <BrandMark height={40} maxWidth={200} />
          </Link>
          {tagline && <p className="fl-footer-tagline">{tagline}</p>}
          {socials.length > 0 && (
            <div className="fl-footer-socials">
              {socials.map((so, i) => (
                <a
                  key={`${so.kind}-${i}`}
                  href={so.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fl-social"
                  aria-label={socialLabel(so.kind)}
                  title={socialLabel(so.kind)}
                >
                  {/* One glyph per platform the API allows; the kind is an
                      enum the backoffice picks from, not free text. */}
                  <Icon name={so.kind} size={18} />
                </a>
              ))}
            </div>
          )}
        </div>

        {links.length > 0 && (
          <nav className="fl-footer-col" aria-label={s('footer_shop_heading')}>
            <h4>{s('footer_shop_heading')}</h4>
            {links.map((n) => (
              <Link key={n.path} to={n.path}>
                {n.label}
              </Link>
            ))}
          </nav>
        )}

        {cats.length > 0 && (
          <nav className="fl-footer-col" aria-label={s('footer_categories_heading')}>
            <h4>{s('footer_categories_heading')}</h4>
            {cats.map((c) => (
              <Link key={c.key} to={`/katalog?cat=${encodeURIComponent(c.key)}`}>
                {c.label}
              </Link>
            ))}
          </nav>
        )}

        {hasContact && (
          <div className="fl-footer-col" style={{ gap: 6 }}>
            <h4>{s('footer_contact_heading')}</h4>
            {address.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
            {brand.phone && <a href={phoneHref}>{brand.phone}</a>}
            {brand.email && <a href={`mailto:${brand.email}`}>{brand.email}</a>}
            {brand.opening_hours && <span className="fl-footer-quiet">{brand.opening_hours}</span>}
          </div>
        )}

        {(payments.length > 0 || ships.length > 0) && (
          <div className="fl-footer-col" style={{ gap: 14 }}>
            {payments.length > 0 && (
              <div className="fl-footer-chips">
                <h4>{s('footer_payment_heading')}</h4>
                <div>
                  {payments.map((m) => (
                    <span key={m.code}>{m.name}</span>
                  ))}
                </div>
              </div>
            )}
            {ships.length > 0 && (
              <div className="fl-footer-chips">
                <h4>{s('footer_shipping_heading')}</h4>
                <div>
                  {ships.map((c, i) => (
                    <span key={`${c.code}-${i}`}>{c.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {brand.copyright && (
        <div className="fl-footer-bottom">
          <div>{brand.copyright}</div>
        </div>
      )}
    </footer>
  );
}
