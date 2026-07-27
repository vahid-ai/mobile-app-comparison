/**
 * Guards the one thing that can silently desync the app from its backend:
 * `server/seed.sql` is generated from `src/core/catalog.ts`, so if the
 * catalog changes and nobody re-runs the generator, D1 keeps serving the
 * old data while the offline fallback serves the new.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildSeedSql } from '../../server/scripts/generate-seed';

describe('seed.sql', () => {
  it('matches what the generator emits from the catalog', () => {
    const committed = readFileSync(join(__dirname, '..', '..', 'server', 'seed.sql'), 'utf8');
    expect(committed).toBe(buildSeedSql());
  });
});
