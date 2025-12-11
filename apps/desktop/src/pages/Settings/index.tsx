import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, AlertTriangle, Terminal, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { openExternal } from '@/lib/electron';

export function SettingsPage() {
  const { t } = useTranslation();
  const { data: typosStatus } = trpc.analysis.checkTypos.useQuery();
  const { data: authStatus } = trpc.analysis.checkAuth.useQuery();

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="border-b p-4 titlebar-drag">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="p-4 space-y-6 max-w-2xl">
        {/* Tools Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              {t('settings.analysisTools')}
            </CardTitle>
            <CardDescription>
              {t('settings.analysisToolsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${typosStatus?.available ? 'bg-green-100' : 'bg-red-100'}`}>
                  {typosStatus?.available ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium">typos-cli</p>
                  <p className="text-sm text-muted-foreground">
                    {typosStatus?.available
                      ? t('settings.version', { version: typosStatus.version })
                      : t('settings.notInstalled')}
                  </p>
                </div>
              </div>
              {!typosStatus?.available && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openExternal('https://github.com/crate-ci/typos')}
                >
                  {t('settings.install')}
                </Button>
              )}
            </div>

            {!typosStatus?.available && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <p className="font-medium mb-2">{t('settings.installInstructions')}:</p>
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  cargo install typos-cli
                </code>
                <p className="mt-2">
                  {t('settings.orHomebrew')}:{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    brew install typos-cli
                  </code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GitHub Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              {t('settings.githubAuth')}
            </CardTitle>
            <CardDescription>
              {t('settings.githubAuthDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* gh CLI */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${authStatus?.ghCli.authenticated ? 'bg-green-100' : authStatus?.ghCli.installed ? 'bg-yellow-100' : 'bg-red-100'}`}>
                  {authStatus?.ghCli.authenticated ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : authStatus?.ghCli.installed ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium">GitHub CLI (gh)</p>
                  <p className="text-sm text-muted-foreground">
                    {authStatus?.ghCli.authenticated
                      ? t('settings.loggedInAs', { username: authStatus.ghCli.username })
                      : authStatus?.ghCli.installed
                      ? t('settings.installedNotAuth', { version: authStatus.ghCli.version })
                      : t('settings.notInstalled')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {authStatus?.ghCli.authenticated && (
                  <Badge variant="success">{t('settings.recommended')}</Badge>
                )}
                {!authStatus?.ghCli.installed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openExternal('https://cli.github.com/')}
                  >
                    {t('settings.install')}
                  </Button>
                )}
                {authStatus?.ghCli.installed && !authStatus?.ghCli.authenticated && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openExternal('https://cli.github.com/manual/gh_auth_login')}
                  >
                    {t('settings.authenticate')}
                  </Button>
                )}
              </div>
            </div>

            {!authStatus?.ghCli.authenticated && authStatus?.ghCli.installed && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <p className="font-medium mb-2">{t('settings.runToAuth')}:</p>
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  gh auth login
                </code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.about')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('settings.aboutDescription')}
            </p>
            <div className="flex gap-4 text-sm">
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => openExternal('https://github.com/user/repo-polisher')}
              >
                {t('settings.githubRepo')}
              </Button>
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => openExternal('https://github.com/user/repo-polisher/issues')}
              >
                {t('settings.reportIssue')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-4">
              {t('app.version', { version: '0.1.0' })} • MIT License
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
