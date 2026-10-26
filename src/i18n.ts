import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { roomLocales } from './locales/rooms';

import en from './locales/en/translation.json';
import es from './locales/es/translation.json';
import pt from './locales/pt/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: {...en, ...roomLocales.en, studio: {...en.studio, ...roomLocales.en.studio}} },
      es: { translation: {...es, ...roomLocales.es, studio: {...es.studio, ...roomLocales.es.studio}} },
      pt: { translation: {...pt, ...roomLocales.pt, studio: {...pt.studio, ...roomLocales.pt.studio}} },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'pt'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
