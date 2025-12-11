import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  FolderGit2,
  Search,
  GitPullRequest,
  Settings,
  Sparkles,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

export function Sidebar() {
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.projects'), href: '/', icon: FolderGit2 },
    { name: t('nav.analysis'), href: '/analysis', icon: Search },
    { name: t('nav.pullRequests'), href: '/prs', icon: GitPullRequest },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-full w-56 flex-col border-r bg-muted/30">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b px-4 titlebar-drag">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-semibold">{t('app.name')}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-4 space-y-3">
        <LanguageSwitcher />
        <p className="text-xs text-muted-foreground">
          {t('app.version', { version: '0.1.0' })}
        </p>
      </div>
    </div>
  );
}
