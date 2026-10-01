import { useState } from 'react';

import { useConfig } from '@sepetakhq/storefront-kit/config/ConfigProvider';

/**
 * The shop's name: its uploaded logo, or the design's wordmark (primary in
 * the serif, accent run on in italic).
 *
 * Deliberately not `ui/Img.jsx`: a logo whose ratio nobody knows would be
 * cropped by it, and its loading gradient would show through a transparent
 * PNG. The height is fixed and the width follows the image, so a wide
 * wordmark logo and a square monogram both fit. A logo that fails to load
 * falls back to the wordmark rather than leaving a hole -- the media pipeline
 * never retries an asset it once refused.
 *
 * @param {number} height   logo height in px; width follows the image
 * @param {number} maxWidth cap, so an extremely wide logo cannot push the nav
 */
export function BrandMark({ height = 38, maxWidth = 200 }) {
  const { brand, tenant } = useConfig();
  const [failed, setFailed] = useState(false);

  const logo = brand.logoImage;
  const primary = brand.wordmark_primary || tenant?.name || '';
  const accent = brand.wordmark_accent || '';
  const name = [primary, accent].filter(Boolean).join(' ');

  if (logo?.url && !failed) {
    return (
      <img
        src={logo.url}
        srcSet={logo.srcset || undefined}
        sizes={logo.srcset ? `${maxWidth}px` : undefined}
        // Never empty: this image *is* the shop's name.
        alt={logo.alt || name}
        height={height}
        onError={() => setFailed(true)}
        style={{ height, width: 'auto', maxWidth, display: 'block', objectFit: 'contain' }}
      />
    );
  }

  // The design's one-line mark: the name in the serif, the accent run on in
  // italic, and the small dot after it.
  return (
    <span className="fl-wordmark-text" style={{ maxWidth }}>
      <span className="fl-wordmark-primary">{primary}</span>
      {accent && <span className="fl-wordmark-accent">{accent}</span>}
      <span className="fl-wordmark-dot" aria-hidden="true" />
    </span>
  );
}
