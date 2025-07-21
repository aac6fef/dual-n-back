import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import zhCnTranslation from './locales/zh_cn.json';
import { locale } from '@tauri-apps/plugin-os';

const resources = {
  en: {
    translation: enTranslation,
  },
  zh_cn: {
    translation: zhCnTranslation,
  },
};

export const initializeI18n = async () => {
  const langKey = 'settings:language';
  const followKey = 'settings:followSystemLanguage';

  let language;
  const followSystem = JSON.parse(localStorage.getItem(followKey) ?? 'true');

  if (followSystem) {
    const systemLocale = await locale();
    language = systemLocale?.toLowerCase().startsWith('zh') ? 'zh_cn' : 'en';
    // Also update the stored language to reflect the system's one
    localStorage.setItem(langKey, JSON.stringify(language));
  } else {
    // Parse the stored value, fallback to 'en' if it's somehow null
    language = JSON.parse(localStorage.getItem(langKey) ?? '"en"');
  }

  return i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // react already safes from xss
      },
    });
};

export default i18n;
