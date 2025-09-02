import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import es from './locales/es.json';

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources: {
      en: {
        translation: en
      },
      es: {
        translation: es
      }
    },
    fallbackLng: 'en', // Fallback language
    debug: false, // Set to true for development
    
    detection: {
      // Options for language detection
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },

    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;