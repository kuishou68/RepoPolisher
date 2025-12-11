import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { languages } from '@/locales';
import { changeLanguage } from '@/lib/i18n';
import { Button } from './button';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const currentLanguage = languages.find(
    (l) => l.code === currentLang || currentLang.startsWith(l.code.split('-')[0])
  ) || languages[0];

  return (
    <div className="relative group">
      <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
        <Globe className="h-4 w-4" />
        <span>{currentLanguage.nativeName}</span>
      </Button>
      {/* 下拉菜单向上弹出 */}
      <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50">
        <div className="bg-popover border rounded-lg shadow-lg py-1 min-w-[140px]">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                currentLang === lang.code || currentLang.startsWith(lang.code.split('-')[0])
                  ? 'bg-muted font-medium'
                  : ''
              }`}
            >
              {lang.nativeName}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
