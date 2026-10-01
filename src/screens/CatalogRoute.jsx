import { Link, useSearchParams } from 'react-router-dom';

import { useCategories, useProducts } from '@sepetakhq/storefront-kit/hooks/queries';
import { useConfig } from '@sepetakhq/storefront-kit/config/ConfigProvider';

import ProductCard from '../components/ProductCard.jsx';
import { SearchBox } from '../components/Header.jsx';
import { Tile } from '../components/Tile.jsx';
import { Img, SIZES } from '../ui/Img.jsx';
import { EmptyState, ErrorState, InlineError, ProductGridSkeleton } from '../ui/states.jsx';
import { SORTS, catalogChips, catalogTitle, categorySpec, sectionText, sortOrDefault } from '../lib/copy.js';

/**
 * The design's collections, above the unfiltered catalogue: one tile per
 * category with its picture (or initials), name and material line, each a
 * link to that filter.
 */
function CollectionTiles({ cats }) {
  return (
    <nav aria-label="Koleksi" className="fl-collections hs">
      {cats.map((c) => (
        <Link key={c.key} to={`/katalog?cat=${encodeURIComponent(c.key)}`} className="fl-collection">
          <span className="fl-collection-media">
            <Img
              src={c.image}
              srcSet={c.image_srcset}
              sizes={SIZES.categoryTile}
              alt=""
              ratio="auto"
              radius={0}
              style={{ position: 'absolute', inset: 0 }}
              fallback={<Tile label={c.label} tintKey={c.key} size={22} />}
            />
          </span>
          <span className="fl-collection-body">
            <b>{c.label}</b>
            {categorySpec(c) && <span>{categorySpec(c)}</span>}
          </span>
        </Link>
      ))}
    </nav>
  );
}

/**
 * The catalogue. Every filter lives in the URL -- `cat`, `sale`, `q`,
 * `sort` -- so a filtered page is a link and the back button unwinds it.
 * All four are the API's: `sale=1` asks for `on_sale`, so the promo list is
 * complete on every page rather than whatever the first page happened to hold.
 */
export default function CatalogRoute() {
  const [params, setParams] = useSearchParams();
  const cat = params.get('cat') || '';
  const sort = sortOrDefault(params.get('sort'));
  const sale = params.get('sale') === '1';
  const q = (params.get('q') ?? '').trim();

  const { brand, copy } = useConfig();
  const promoTitle = sectionText(brand.sections, 'promo_title');
  const categories = useCategories();
  const products = useProducts({ cat, sort, q, on_sale: sale ? 1 : undefined });
  const cats = categories.data ?? [];

  const setSort = (value) => {
    const next = new URLSearchParams(params);
    if (value === 'featured') next.delete('sort');
    else next.set('sort', value);
    setParams(next);
  };

  const items = (products.data?.pages ?? []).flatMap((p) => p.products ?? []);
  const filters = { cat, sale, q };
  const title = catalogTitle(filters, cats, promoTitle);
  const chips = catalogChips(cats, filters, sort, promoTitle);
  const filtered = Boolean(cat || sale || q);
  const current = cats.find((c) => c.key === cat);
  const sub = q ? 'Pencarian nama produk' : sale ? sectionText(brand.sections, 'promo_subtitle', copy) : current?.subtitle ?? '';
  const spec = categorySpec(current);

  return (
    <main aria-label="Katalog">
      <section className="fl-pagehead">
        <div className="fl-inner" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <nav aria-label="Breadcrumb" className="fl-crumbs">
            <Link to="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <h1>{title}</h1>
            {sub && <div style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--fl-muted)' }}>{sub}</div>}
            {spec && <div style={{ fontSize: 13, color: 'var(--fl-muted-2)' }}>{spec}</div>}
            <span style={{ fontSize: 13, color: 'var(--fl-muted)' }} aria-live="polite">
              {products.isPending ? 'Memuat…' : `${items.length}${products.hasNextPage ? '+' : ''} produk`}
            </span>
          </div>
          {categories.isError ? (
            <InlineError error={categories.error} onRetry={categories.refetch} />
          ) : (
            // One scrolling row, not a wrapping block: ten categories would
            // otherwise push the products below the fold on a phone.
            <nav aria-label="Kategori" className="hs" style={{ display: 'flex', gap: 8, margin: '0 calc(-1 * var(--fl-gutter))', padding: '2px var(--fl-gutter)' }}>
              {chips.map((c) => (
                <Link key={c.key} to={c.to} className="fl-pill" aria-current={c.current ? 'true' : undefined}>
                  {c.label}
                </Link>
              ))}
            </nav>
          )}
          {/* The design's search and sort under the chips. */}
          <div className="fl-tools">
            <SearchBox />
            <select className="fl-input" aria-label="Urutkan" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="fl-wrap" style={{ paddingTop: 32, width: '100%' }}>
        {current?.image && (
          <div className="fl-catbanner">
            <Img src={current.image} srcSet={current.image_srcset} sizes={SIZES.hero} alt="" ratio="auto" radius={0} style={{ position: 'absolute', inset: 0 }} />
          </div>
        )}
        {!filtered && cats.length > 0 && <CollectionTiles cats={cats} />}
        {filtered && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
            <Link to={sort === 'featured' ? '/katalog' : `/katalog?sort=${sort}`} className="fl-pill">
              <span>Hapus filter</span>
              <span aria-hidden="true">×</span>
            </Link>
          </div>
        )}

        {products.isPending ? (
          <ProductGridSkeleton count={8} />
        ) : products.isError ? (
          <ErrorState error={products.error} onRetry={products.refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            title={sale ? 'Belum ada promo saat ini' : 'Belum ada produk yang cocok'}
            body={q ? `Tidak ada produk bernama “${q}”. Coba kata kunci lain atau pilih kategori.` : sale ? 'Promo berikutnya akan muncul di sini.' : 'Coba kategori lain atau lihat semua produk.'}
            action={
              <Link to="/katalog" className="fl-btn fl-btn-primary">
                {sectionText(brand.sections, 'grid_see_all')}
              </Link>
            }
          />
        ) : (
          <>
            <div className="fl-cards">
              {items.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
            {products.hasNextPage && (
              <div style={{ textAlign: 'center', marginTop: 28 }}>
                <button type="button" className="fl-btn fl-btn-outline" disabled={products.isFetchingNextPage} onClick={() => products.fetchNextPage()}>
                  {products.isFetchingNextPage ? 'Memuat…' : 'Muat lagi'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
