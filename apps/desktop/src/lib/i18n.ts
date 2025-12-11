import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources, defaultLanguage } from '../locales';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: defaultLanguage,
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'repo-polisher-language',
    },
  });

export default i18n;

export function changeLanguage(lang: string) {
  i18n.changeLanguage(lang);
  localStorage.setItem('repo-polisher-language', lang);
}

export function getCurrentLanguage() {
  return i18n.language;
}
