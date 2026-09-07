import type { FirebaseClientConfig } from '../auth/config';
import { getChessyFirebaseApp } from '../firebase/client';
import type { AnalyticsAdapter, AnalyticsEventName, AnalyticsParams } from './types';

export async function createFirebaseAnalyticsAdapter(config: FirebaseClientConfig): Promise<AnalyticsAdapter | null> {
  if (!config.measurementId) return null;
  const analyticsModule = await import('firebase/analytics');
  if (!(await analyticsModule.isSupported())) return null;
  const app = await getChessyFirebaseApp(config);
  const analytics = analyticsModule.initializeAnalytics(app, { config: { send_page_view: false } });

  const applyConsent = (enabled: boolean) => {
    analyticsModule.setConsent({
      analytics_storage: enabled ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      personalization_storage: 'denied',
    });
    analyticsModule.setAnalyticsCollectionEnabled(analytics, enabled);
  };

  applyConsent(true);
  return {
    setEnabled(enabled) { applyConsent(enabled); },
    track(name: AnalyticsEventName, params?: AnalyticsParams) {
      if (name === 'screen_view') {
        const screenName = typeof params?.screen_name === 'string' ? params.screen_name : 'unknown';
        analyticsModule.logEvent(analytics, 'screen_view', { firebase_screen: screenName, firebase_screen_class: 'ChessyPWA' });
        return;
      }
      analyticsModule.logEvent(analytics, name, params);
    },
  };
}
