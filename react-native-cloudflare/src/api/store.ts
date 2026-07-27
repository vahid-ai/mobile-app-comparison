/**
 * The store — the one place effects live.
 *
 * Zero Native's core is "a pure loop: no effects, no subscriptions". The
 * reducer here keeps that property exactly (`src/core/model.ts` is pure and
 * has no imports from this file); what the Cloudflare backend adds is a
 * thin shell around it that
 *
 *   - loads the catalog and this user's state on mount, then dispatches
 *     `catalog_loaded`, and
 *   - writes RSVP / follow changes back to D1 after the reducer has
 *     already produced the next model.
 *
 * Writes are optimistic: the UI moves at once and the request follows. A
 * failed write logs and flips the sync banner to offline; it does not roll
 * the model back, because the local model is still what the user asked for
 * and the next successful bootstrap reconciles it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { BUNDLED_CATALOG } from '../core/catalog';
import { followOf, initialModel, rsvpOf, update, type Model, type Msg } from '../core/model';
import { ApiError, API_BASE, fetchBootstrap, putFollow, putRsvp } from './client';

export type Store = {
  model: Model;
  dispatch: (msg: Msg) => void;
  reload: () => void;
};

export function usePulseStore(): Store {
  const modelRef = useRef<Model>(initialModel());
  const [model, setModel] = useState<Model>(modelRef.current);
  /** Guards against a late bootstrap landing after the screen unmounted. */
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const apply = useCallback((msg: Msg): Model => {
    const next = update(modelRef.current, msg);
    modelRef.current = next;
    setModel(next);
    return next;
  }, []);

  /** Push whatever the reducer just decided to D1. */
  const persist = useCallback(
    async (msg: Msg, next: Model): Promise<void> => {
      if (!API_BASE) return;
      try {
        switch (msg.type) {
          case 'join_event':
            await putRsvp(msg.id, rsvpOf(next, msg.id));
            break;
          case 'toggle_going':
          case 'toggle_interested':
            await putRsvp(next.selectedId, rsvpOf(next, next.selectedId));
            break;
          case 'toggle_follow':
            await putFollow(next.selectedId, followOf(next, next.selectedId));
            break;
          default:
            break;
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : String(err);
        console.warn(`[pulse] write failed: ${message}`);
        if (aliveRef.current) apply({ type: 'sync_failed', error: message, catalog: BUNDLED_CATALOG });
      }
    },
    [apply],
  );

  const dispatch = useCallback(
    (msg: Msg) => {
      const next = apply(msg);
      void persist(msg, next);
    },
    [apply, persist],
  );

  const load = useCallback(async (): Promise<void> => {
    try {
      const { catalog, state } = await fetchBootstrap();
      if (!aliveRef.current) return;
      apply({ type: 'catalog_loaded', catalog, state, source: 'cloudflare' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : String(err);
      console.warn(`[pulse] bootstrap failed, using bundled catalog: ${message}`);
      if (!aliveRef.current) return;
      apply({ type: 'sync_failed', error: message, catalog: BUNDLED_CATALOG });
    }
  }, [apply]);

  const reload = useCallback(() => {
    apply({ type: 'reload' });
    void load();
  }, [apply, load]);

  useEffect(() => {
    void load();
    // `load` is stable (useCallback with a stable dep), so this runs once.
  }, [load]);

  return { model, dispatch, reload };
}
