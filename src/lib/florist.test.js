import { describe, expect, it } from 'vitest';

import { DEFAULT_LABELS, categorySpec, headlineParts, mapsLink, sectionText } from './copy.js';

// The helpers this template added on top of the fork: each one draws only
// what the shop sent, and nothing at all for what it did not.

describe('headlineParts', () => {
  it('splits the headline at the percentage it states', () => {
    expect(headlineParts({ headline: 'Diskon hingga 20%', discount_type: 'percentage', discount_value: 20 })).toEqual({ pre: 'Diskon hingga ', accent: '20%' });
  });

  it('keeps a headline whole when it does not carry the figure, or the discount is not a percentage', () => {
    expect(headlineParts({ headline: 'Hemat besar', discount_type: 'percentage', discount_value: 20 })).toEqual({ pre: 'Hemat besar', accent: '' });
    expect(headlineParts({ headline: 'Diskon 20%', discount_type: 'fixed', discount_value: 20 })).toEqual({ pre: 'Diskon 20%', accent: '' });
    expect(headlineParts({ headline: 'Diskon 20%', discount_type: 'percentage', discount_value: 0 })).toEqual({ pre: 'Diskon 20%', accent: '' });
  });

  it('phrases a campaign with no headline from its discount, and splits that', () => {
    expect(headlineParts({ discount_type: 'percentage', discount_value: 30 })).toEqual({ pre: 'Diskon hingga ', accent: '30%' });
  });

  it('survives an empty campaign', () => {
    expect(headlineParts(undefined)).toEqual({ pre: '', accent: '' });
  });
});

describe('mapsLink', () => {
  it('searches the whole address, encoded', () => {
    expect(mapsLink({ address_line1: 'Jl. Contoh No. 1', address_line2: ' Kota 12345 ' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=Jl.%20Contoh%20No.%201%2C%20Kota%2012345',
    );
  });
  it('is empty without an address', () => {
    expect(mapsLink({ address_line1: '  ', address_line2: '' })).toBe('');
    expect(mapsLink()).toBe('');
  });
});

describe('categorySpec', () => {
  it("joins the merchant's label and text, and drops a lone label", () => {
    expect(categorySpec({ spec_label: 'Bahan', material_spec: 'Jati' })).toBe('Bahan · Jati');
    expect(categorySpec({ material_spec: 'Jati' })).toBe('Jati');
    expect(categorySpec({ spec_label: 'Bahan', material_spec: '' })).toBe('');
  });
});

describe('DEFAULT_LABELS', () => {
  it('has a non-empty default for every label the florist pages draw', () => {
    for (const key of ['cats_heading', 'grid_see_all', 'hero_secondary_cta', 'campaign_cta', 'about_address_heading',
      'about_hours_heading', 'about_contact_heading', 'footer_shop_heading', 'footer_categories_heading', 'countdown_label']) {
      expect(DEFAULT_LABELS[key], key).toBeTruthy();
      expect(sectionText({}, key)).toBe(DEFAULT_LABELS[key]);
    }
  });
});
