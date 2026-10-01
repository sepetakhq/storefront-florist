import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { useConfig } from '@sepetakhq/storefront-kit/config/ConfigProvider';
import { useHome } from '@sepetakhq/storefront-kit/hooks/queries';
import { qk } from '@sepetakhq/storefront-kit/api/queryKeys';
import { serverNow } from '@sepetakhq/storefront-kit/api/client';

import ProductCard from '../components/ProductCard.jsx';
import { Tile } from '../components/Tile.jsx';
import { Img, SIZES } from '../ui/Img.jsx';
import Icon from '../ui/Icon.jsx';
import { CountdownCells } from '../ui/Countdown.jsx';
import { EmptyState, ErrorState, ProductGridSkeleton, Skeleton } from '../ui/states.jsx';
import {
  HERO_INTERVAL_MS,
  bannerTheme,
  categorySpec,
  featureMark,
  headlineParts,
  heroSlides,
  nextSlide,
  sectionText,
  showCountdown,
} from '../lib/copy.js';

/** Products beyond which the carousel earns its arrows. */
export const RAIL_ARROWS_AFTER = 4;
/** Products a campaign panel shows: one row of cards on a wide screen. */
export const CAMPAIGN_CARDS = 4;

/** The home page is the section list the merchant published, in order. */
export default function HomeRoute() {
  const { data, isPending, isError, error, refetch } = useHome();

  if (isPending) return <HomeSkeleton />;
  if (isError) {
    return (
      <main className="fl-wrap" style={{ paddingTop: 60 }}>
        <ErrorState error={error} onRetry={refetch} />
      </main>
    );
  }
  const sections = (data?.sections ?? []).filter(renders);
  if (sections.length === 0) return <EmptyHome />;
  return (
    <main>
      <Sections sections={sections} />
    </main>
  );
}

/**
 * A published section list, drawn in order. Shared with the About page, whose
 * sections the merchant edits on the same backoffice screen.
 */
export function Sections({ sections }) {
  return sections.filter(renders).map((sec, i) => <Section key={sec.id ?? i} sec={sec} />);
}

/** Whether a section has anything to draw; an empty one is skipped. */
export function renders(sec) {
  switch (sec?.type) {
    case 'hero':
      return Boolean(sec.hero?.title);
    case 'features':
      return Boolean(sec.features?.items?.length);
    case 'cats':
      return Boolean(sec.cats?.length);
    case 'campaign':
      return Boolean(sec.campaign);
    case 'grid':
    case 'carousel':
      return Boolean(sec.grid?.products?.length);
    case 'story':
      return Boolean(sec.story?.title);
    case 'banner':
      return Boolean(sec.banner?.text);
    default:
      // A type this bundle predates: skipped, the way the resolver skips one
      // it does not know.
      return false;
  }
}

function Section({ sec }) {
  switch (sec.type) {
    case 'hero':
      return <Hero hero={sec.hero} />;
    case 'features':
      return <Features features={sec.features} />;
    case 'cats':
      return <Categories cats={sec.cats} />;
    case 'campaign':
      return <Campaign campaign={sec.campaign} />;
    case 'grid':
      return <Grid grid={sec.grid} />;
    case 'carousel':
      return <Rail grid={sec.grid} />;
    case 'story':
      return <Story story={sec.story} />;
    case 'banner':
      return <Banner banner={sec.banner} />;
    default:
      return null;
  }
}

/** A section heading with the design's flower after it, and its "see all". */
function Head({ title, seeAll, to = '/katalog' }) {
  return (
    <div className="fl-head">
      <h2 className="fl-h2">
        {title}
        <Icon name="flower" size={20} className="fl-accent-glyph" />
      </h2>
      {seeAll && (
        <Link to={to} className="fl-btn fl-btn-outline fl-btn-sm">
          {seeAll}
        </Link>
      )}
    </div>
  );
}

/* --- hero ---------------------------------------------------------------- */

function Hero({ hero }) {
  const { brand } = useConfig();
  const stats = (brand.heroStats ?? []).filter((s) => s?.value);
  const secondary = sectionText(brand.sections, 'hero_secondary_cta');

  return (
    <section className="fl-hero">
      <div className="fl-hero-card">
        <div className="fl-hero-copy">
          {brand.hero_eyebrow && <span className="fl-eyebrow">{brand.hero_eyebrow}</span>}
          {/* `em` is the backoffice's "Penekanan": words that follow the title,
              drawn on their own line in the accent colour. */}
          <h1>
            <span>{hero.title}</span>
            {hero.em && <em>{hero.em}</em>}
          </h1>
          {hero.sub && <p className="fl-hero-sub">{hero.sub}</p>}
          <div className="fl-hero-actions">
            <Link to="/katalog" className="fl-btn fl-btn-primary">
              {hero.cta || 'Belanja sekarang'}
              <Icon name="flower" size={16} />
            </Link>
            {secondary && (
              <Link to="/lacak" className="fl-btn fl-btn-outline">
                {secondary}
              </Link>
            )}
          </div>
          {stats.length > 0 && (
            <dl className="fl-hero-stats">
              {stats.map((s, i) => (
                <div key={i}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <HeroGallery images={brand.heroImages} />
      </div>
    </section>
  );
}

/**
 * The shop's hero pictures, one at a time. Rotates every few seconds when
 * there is more than one, unless the buyer asked for reduced motion or is
 * pointing at or focused inside it; the dots switch by hand either way.
 */
export function HeroGallery({ images }) {
  const slides = heroSlides(images);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;

  useEffect(() => {
    const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (n < 2 || paused || still) return undefined;
    const id = setInterval(() => setIndex((i) => nextSlide(i, n)), HERO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [n, paused]);

  const at = n ? index % n : 0;
  const picture = slides[at];

  return (
    <div
      className="fl-hero-media"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Img
        key={picture?.url ?? 'none'}
        src={picture?.url}
        srcSet={picture?.srcset}
        sizes={SIZES.hero}
        alt={picture?.alt ?? ''}
        ratio="auto"
        priority
        radius={0}
        style={{ position: 'absolute', inset: 0, background: 'transparent' }}
        fallback={<EmptyPicture />}
      />
      {n > 1 && (
        <div className="fl-hero-dots" role="group" aria-label="Foto">
          {slides.map((s, i) => (
            <button
              key={s.url}
              type="button"
              aria-label={s.alt || `Foto ${i + 1}`}
              aria-pressed={i === at}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** What an image slot shows before the merchant uploads one. */
function EmptyPicture({ size = 120 }) {
  return (
    <div aria-hidden="true" className="fl-empty-picture">
      <Icon name="flower" size={size} strokeWidth={0.8} />
    </div>
  );
}

/* --- features ----------------------------------------------------------- */

function Features({ features }) {
  const items = features.items.slice(0, 8);
  return (
    <section className="fl-section fl-section-tight" aria-label={features.title || undefined}>
      {features.title && <h2 className="fl-h2" style={{ marginBottom: 16 }}>{features.title}</h2>}
      {/* data-n lets the stylesheet lay out by count (1–8), so no count
          leaves a lone card on its own row. */}
      <ul className="fl-features" data-n={items.length}>
        {items.map((it, i) => {
          const mark = featureMark(it.mark);
          return (
            <li key={i} className="fl-feature">
              <span className="fl-feature-mark" aria-hidden="true">
                {mark.icon ? <Icon name={mark.icon} size={20} /> : mark.text}
              </span>
              <span className="fl-feature-copy">
                <b>{it.title}</b>
                {it.body && <span>{it.body}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* --- categories --------------------------------------------------------- */

function Categories({ cats }) {
  const { brand } = useConfig();
  return (
    <section id="kategori" className="fl-section" style={{ scrollMarginTop: 90 }}>
      <Head title={sectionText(brand.sections, 'cats_heading')} seeAll={sectionText(brand.sections, 'grid_see_all')} />
      <div className="fl-cards">
        {cats.map((c) => (
          <Link key={c.key} to={`/katalog?cat=${encodeURIComponent(c.key)}`} className="fl-cat">
            <span className="fl-cat-media">
              <Img
                src={c.image}
                srcSet={c.image_srcset}
                sizes={SIZES.categoryTile}
                alt=""
                ratio="auto"
                radius={0}
                style={{ position: 'absolute', inset: 0, background: 'transparent' }}
                fallback={<Tile label={c.label} tintKey={c.key} size={30} />}
              />
            </span>
            <span className="fl-cat-body">
              <span className="fl-cat-text">
                <b>{c.label}</b>
                {c.subtitle && <span>{c.subtitle}</span>}
                {!c.subtitle && categorySpec(c) && <span>{categorySpec(c)}</span>}
              </span>
              <span className="fl-cat-go" aria-hidden="true">
                <Icon name="arrow" size={15} strokeWidth={2} />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* --- product grid and carousel ------------------------------------------ */

function Grid({ grid }) {
  const { brand } = useConfig();
  return (
    <section className="fl-section">
      <Head title={grid.title || 'Produk pilihan'} seeAll={sectionText(brand.sections, 'grid_see_all')} />
      <div className="fl-cards">
        {grid.products.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

function Rail({ grid }) {
  const { brand } = useConfig();
  const track = useRef(null);
  const scroll = (dir) => {
    const el = track.current;
    if (!el) return;
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: smooth ? 'smooth' : 'auto' });
  };
  const arrows = grid.products.length > RAIL_ARROWS_AFTER;

  return (
    <section className="fl-section">
      <Head title={grid.title || 'Produk pilihan'} seeAll={sectionText(brand.sections, 'grid_see_all')} />
      <div className="fl-rail">
        {arrows && (
          <>
            <button type="button" className="fl-rail-arrow prev" aria-label="Sebelumnya" onClick={() => scroll(-1)}>
              <Icon name="prev" size={18} strokeWidth={2} />
            </button>
            <button type="button" className="fl-rail-arrow next" aria-label="Berikutnya" onClick={() => scroll(1)}>
              <Icon name="next" size={18} strokeWidth={2} />
            </button>
          </>
        )}
        <ul ref={track} className="fl-rail-track">
          {grid.products.map((p) => (
            <li key={p.id} className="fl-rail-item">
              <ProductCard p={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --- story -------------------------------------------------------------- */

function Story({ story }) {
  const { brand } = useConfig();
  const portrait = brand.aboutImage;

  return (
    <section className="fl-section">
      <div className="fl-story">
        <div className="fl-story-copy">
          <span className="fl-eyebrow is-deep">{sectionText(brand.sections, 'story_eyebrow')}</span>
          <h2>{story.title}</h2>
          {story.text && <p>{story.text}</p>}
          <Link to="/tentang" className="fl-btn fl-btn-rust">
            {sectionText(brand.sections, 'story_cta')}
            <Icon name="flower" size={15} />
          </Link>
        </div>
        {portrait?.url && (
          <div className="fl-story-media">
            <Img
              src={portrait.url}
              srcSet={portrait.srcset}
              sizes={SIZES.hero}
              alt={portrait.alt ?? ''}
              ratio="auto"
              radius={0}
              style={{ position: 'absolute', inset: 0, background: 'transparent' }}
              fallback={<EmptyPicture />}
            />
          </div>
        )}
      </div>
    </section>
  );
}

/* --- campaign ----------------------------------------------------------- */

/**
 * The design's green sale panel: the promotion's badge and name, the big
 * line, the countdown, a row of its products, and the button to the sale.
 */
function Campaign({ campaign }) {
  const qc = useQueryClient();
  const { brand } = useConfig();
  const products = (campaign.products ?? []).slice(0, CAMPAIGN_CARDS);
  // A countdown only for a real, near deadline: none for a promotion with no
  // end date, one already past, or one weeks away.
  const ticking = showCountdown(campaign.ends_at, serverNow());
  const { pre, accent } = headlineParts(campaign);
  const title = String(campaign.title ?? '').trim();

  return (
    <section className="fl-section">
      <div className="fl-campaign">
        <div className="fl-campaign-top">
          <div className="fl-campaign-copy">
            {(campaign.badge || (title && title !== pre + accent)) && (
              <div className="fl-campaign-tags">
                {campaign.badge && <span className="fl-badge">{campaign.badge}</span>}
                {title && title !== pre + accent && <span className="fl-campaign-sub">{title}</span>}
              </div>
            )}
            <h2>
              {pre}
              {accent && <em>{accent}</em>}
            </h2>
          </div>
          {ticking && (
            <CountdownCells
              until={campaign.ends_at}
              label={sectionText(brand.sections, 'countdown_label')}
              onExpire={() => qc.invalidateQueries({ queryKey: qk.home })}
            />
          )}
        </div>
        {products.length > 0 && (
          <div className="fl-cards">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
        {products.length > 0 && (
          <Link to="/katalog?sale=1" className="fl-btn fl-btn-light" style={{ alignSelf: 'flex-start' }}>
            {sectionText(brand.sections, 'campaign_cta')}
          </Link>
        )}
      </div>
    </section>
  );
}

/* --- banner ------------------------------------------------------------- */

function Banner({ banner }) {
  const theme = bannerTheme(banner.bg);
  return (
    <section className="fl-section">
      <div className={theme.className}>
        <div className="fl-banner-text">
          <Icon name="gift" size={30} strokeWidth={1.6} />
          <p>{banner.text}</p>
        </div>
        {banner.cta && (
          <Link to="/katalog" className={theme.button}>
            {banner.cta}
          </Link>
        )}
      </div>
    </section>
  );
}

/* --- states ------------------------------------------------------------- */

function EmptyHome() {
  return (
    <main className="fl-wrap" style={{ paddingTop: 60 }}>
      <EmptyState
        title="Toko sedang disiapkan"
        body="Halaman depan belum diisi. Katalognya sudah bisa dilihat."
        action={
          <Link to="/katalog" className="fl-btn fl-btn-primary">
            Lihat katalog
          </Link>
        }
      />
    </main>
  );
}

function HomeSkeleton() {
  return (
    <main aria-busy="true">
      <div className="fl-hero">
        <div className="fl-hero-card fl-shimmer" style={{ minHeight: 'clamp(380px, 40vw, 520px)' }} />
      </div>
      <div className="fl-wrap" style={{ paddingTop: 40, display: 'grid', gap: 16 }}>
        <Skeleton height={34} width={240} />
        <ProductGridSkeleton count={4} />
      </div>
    </main>
  );
}
