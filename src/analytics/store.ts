import { create } from 'zustand';
import { readAuthRuntimeConfig } from '../auth/config';
import { createFirebaseAnalyticsAdapter } from './firebaseAdapter';
import { readAnalyticsConsent, sanitizeAnalyticsParams, writeAnalyticsConsent } from './privacy';
import type { AnalyticsAdapter, AnalyticsEventName, AnalyticsParams, AnalyticsStatus } from './types';

interface AnalyticsStore {
  enabled: boolean;
  status: AnalyticsStatus;
  initialize(): Promise<void>;
  setEnabled(enabled: boolean): Promise<boolean>;
  track(name: AnalyticsEventName, params?: AnalyticsParams): void;
}

let adapter: AnalyticsAdapter | null = null;
let adapterPromise: Promise<AnalyticsAdapter | null> | null = null;

async function ensureAdapter(): Promise<AnalyticsAdapter | null> {
  if (adapter) return adapter;
  if (adapterPromise) return adapterPromise;
  adapterPromise = (async () => {
    const runtime = readAuthRuntimeConfig();
    if (!runtime.firebase?.measurementId) return null;
    adapter = await createFirebaseAnalyticsAdapter(runtime.firebase);
    return adapter;
  })();
  try { return await adapterPromise; }
  finally { adapterPromise = null; }
}

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  enabled: false,
  status: 'disabled',
  initialize: async () => {
    const enabled = readAnalyticsConsent();
    set({ enabled, status: enabled ? 'initializing' : 'disabled' });
    if (!enabled) return;
    try {
      const active = await ensureAdapter();
      set({ status: active ? 'ready' : 'unavailable' });
    } catch {
      set({ status: 'unavailable' });
    }
  },
  setEnabled: async (enabled) => {
    writeAnalyticsConsent(enabled);
    if (!enabled) {
      adapter?.setEnabled(false);
      set({ enabled: false, status: 'disabled' });
      return true;
    }
    set({ enabled: true, status: 'initializing' });
    try {
      const active = await ensureAdapter();
      if (!active) { set({ status: 'unavailable' }); return false; }
      active.setEnabled(true);
      set({ status: 'ready' });
      return true;
    } catch {
      set({ status: 'unavailable' });
      return false;
    }
  },
  track: (name, params) => {
    if (!get().enabled || get().status === 'unavailable') return;
    const clean = sanitizeAnalyticsParams(name, params);
    void ensureAdapter().then((active) => active?.track(name, clean)).catch(() => undefined);
  },
}));

export function resetAnalyticsStoreForTests() {
  adapter?.setEnabled(false);
  adapter = null;
  adapterPromise = null;
  useAnalyticsStore.setState({ enabled: false, status: 'disabled' });
}
