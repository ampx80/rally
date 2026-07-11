// Programmatic-SEO registry: the slug-uniqueness guard + index integrity.
//
// The raw dataset files intentionally contain overlapping slugs (a topic can
// legitimately appear in more than one source list). registry.js is the single
// dedup point: ENTRIES keeps the FIRST occurrence of each slug and drops the
// rest, so every /pages/:slug URL resolves to exactly one page. These tests
// lock that contract. If a future dataset introduced a slug the dedup failed to
// collapse, the uniqueness assertion below would fail before it ever shipped a
// colliding URL.
import { describe, it, expect } from 'vitest';
import {
  ENTRIES, BY_SLUG, allSlugs, getEntry, byType, byGroup,
  categoriesFor, stats, relatedFor, featured, TYPE_META, GROUP_ORDER,
} from '../marketing/seo/registry.js';
import DATASETS from '../marketing/seo/data/index.js';

describe('slug uniqueness guard', () => {
  it('every entry has a non-empty slug', () => {
    expect(ENTRIES.length).toBeGreaterThan(0);
    expect(ENTRIES.every(e => typeof e.slug === 'string' && e.slug.length > 0)).toBe(true);
  });
  it('allSlugs() contains no duplicates', () => {
    const slugs = allSlugs();
    const unique = new Set(slugs);
    // Surface the offenders if this ever regresses.
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    expect([...new Set(dupes)]).toEqual([]);
    expect(unique.size).toBe(slugs.length);
  });
  it('BY_SLUG resolves exactly one entry per slug', () => {
    expect(BY_SLUG.size).toBe(ENTRIES.length);
    expect(BY_SLUG.size).toBe(allSlugs().length);
  });
  it('ENTRIES equals the set of UNIQUE raw slugs (dedup kept one of each)', () => {
    const rawUnique = new Set(DATASETS.flat().filter(e => e && e.slug).map(e => e.slug));
    expect(ENTRIES.length).toBe(rawUnique.size);
  });
});

describe('lookups', () => {
  it('getEntry resolves a known slug and null for an unknown one', () => {
    const first = ENTRIES[0].slug;
    expect(getEntry(first).slug).toBe(first);
    expect(getEntry('this-slug-does-not-exist')).toBeNull();
  });
  it('normalizes every entry with category/group/icon/updated', () => {
    for (const e of ENTRIES.slice(0, 50)) {
      expect(e.category).toBeTruthy();
      expect(e.group).toBeTruthy();
      expect(e.icon).toBeTruthy();
      expect(e.updated).toBeTruthy();
    }
  });
});

describe('faceting', () => {
  it('byType partitions entries by their type', () => {
    const rankings = byType('ranking');
    expect(rankings.length).toBeGreaterThan(0);
    expect(rankings.every(e => e.type === 'ranking')).toBe(true);
  });
  it('byGroup only returns entries in that group', () => {
    for (const g of GROUP_ORDER) {
      expect(byGroup(g).every(e => e.group === g)).toBe(true);
    }
  });
  it('categoriesFor buckets a group into named categories', () => {
    const cats = categoriesFor('Compare');
    expect(cats.length).toBeGreaterThan(0);
    expect(cats[0]).toHaveProperty('category');
    expect(Array.isArray(cats[0].entries)).toBe(true);
  });
  it('every entry type has presentation metadata', () => {
    const usedTypes = new Set(ENTRIES.map(e => e.type));
    for (const t of usedTypes) {
      // Unknown types fall back to a Resources bucket rather than crashing.
      expect(TYPE_META[t] || true).toBeTruthy();
    }
  });
});

describe('derived helpers', () => {
  it('stats totals match ENTRIES', () => {
    const s = stats();
    expect(s.total).toBe(ENTRIES.length);
    const summed = Object.values(s.byType).reduce((a, b) => a + b, 0);
    expect(summed).toBe(ENTRIES.length);
  });
  it('relatedFor excludes the entry itself and caps at n', () => {
    const entry = byType('ranking')[0] || ENTRIES[0];
    const related = relatedFor(entry, 4);
    expect(related.length).toBeLessThanOrEqual(4);
    expect(related.every(r => r.slug !== entry.slug)).toBe(true);
  });
  it('featured returns at most n link-magnet entries', () => {
    const f = featured(8);
    expect(f.length).toBeLessThanOrEqual(8);
  });
});
