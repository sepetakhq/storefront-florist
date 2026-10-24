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
  const { brand, paymentMethods, couriers, tenant } = useConfig();
  // The platform's mark, on the plans that carry it. Absent on an older API
  // version, which strips the field, so nothing is drawn.
  const badge = tenant?.sepetak_badge === true;
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
                  {chips(payments).map((m) => (
                    <Chip key={m.code} item={m} />
                  ))}
                </div>
              </div>
            )}
            {ships.length > 0 && (
              <div className="fl-footer-chips">
                <h4>{s('footer_shipping_heading')}</h4>
                <div>
                  {chips(ships).map((c, i) => (
                    <Chip key={`${c.code}-${i}`} item={c} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {(brand.copyright || badge) && (
        <div className="fl-footer-bottom">
          <div>
            {brand.copyright && <span>{brand.copyright}</span>}
            {badge && (
              <a href="https://sepetak.com/?ref=toko" target="_blank" rel="noopener" className="fl-footer-badge">
                Dibuat dengan Sepetak
              </a>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}

/**
 * One chip per badge: "VA BCA" and "Transfer BCA", or JNE REG and JNE YES,
 * are the same mark to a buyer checking whether the shop takes their bank or
 * ships with their courier. A name the platform has no badge for stays text.
 */
export function chips(items) {
  const seen = new Set();
  return items.filter((x) => !x.logo_url || (!seen.has(x.logo_url) && seen.add(x.logo_url)));
}

function Chip({ item }) {
  if (!item.logo_url) return <span>{item.name}</span>;
  return (
    <span className="fl-logo-chip" title={item.name}>
      <img src={item.logo_url} alt={item.name} loading="lazy" />
    </span>
  );
}
