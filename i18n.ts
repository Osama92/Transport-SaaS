import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from './locales/en/translation.json';
import igTranslation from './locales/ig/translation.json';
import yoTranslation from './locales/yo/translation.json';
import haTranslation from './locales/ha/translation.json';

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      ig: {
        translation: igTranslation
      },
      yo: {
        translation: yoTranslation
      },
      ha: {
        translation: haTranslation
      }
    },
    lng: 'en',
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18next;
