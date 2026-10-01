import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// public/manifest.json is this template's catalogue entry: the backoffice
// picker and the landing read it from the registry, beside index.html. A
// broken one degrades to the bare template name with no picture, which is
// exactly what this test exists to catch before a push.
const dir = resolve(import.meta.dirname, '../public');

describe('manifest.json', () => {
  const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8'));

  it('names the template and describes it in both landing languages', () => {
    expect(manifest.title.trim().length).toBeGreaterThan(0);
    expect(manifest.description.id.trim().length).toBeGreaterThan(0);
    expect(manifest.description.en.trim().length).toBeGreaterThan(0);
  });

  // A fork inherits its parent's manifest; publishing that one lists this
  // template in the catalogue under the parent's name and pitch.
  it("carries this template's name, not the one it was forked from", () => {
    const pkg = JSON.parse(readFileSync(resolve(dir, '../package.json'), 'utf8'));
    const template = pkg.scripts['publish:local'].match(/SF_TEMPLATE=([\w-]+)/)[1];
    expect(manifest.title.toLowerCase()).toContain(template);
  });

  it('points at a preview that ships with it', () => {
    expect(manifest.preview).toMatch(/^[\w.-]+$/);
    expect(existsSync(resolve(dir, manifest.preview))).toBe(true);
  });
});
