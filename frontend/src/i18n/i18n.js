import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import kn from '../locales/kn.json';
import hi from '../locales/hi.json';
import ta from '../locales/ta.json';
import te from '../locales/te.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', shortName: 'EN', scriptBadge: 'EN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', shortName: 'ಕ', scriptBadge: 'ಕ' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', shortName: 'हि', scriptBadge: 'हि' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', shortName: 'த', scriptBadge: 'த' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', shortName: 'తె', scriptBadge: 'తె' }
];

const STORAGE_KEY = 'urbanpulse_citizen_lang';

const getInitialLanguage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
      return saved;
    }
  } catch (e) {
    // localStorage unavailable
  }
  return 'en';
};

const initialLang = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      kn: { translation: kn },
      hi: { translation: hi },
      ta: { translation: ta },
      te: { translation: te }
    },
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false
    }
  });

// Keep html lang attribute in sync
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
}

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lng;
    }
  } catch (e) {
    // ignore
  }
});

export default i18n;
