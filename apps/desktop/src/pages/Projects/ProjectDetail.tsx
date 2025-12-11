import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Star,
  GitFork,
  Clock,
  AlertCircle,
  ExternalLink,
  FolderOpen,
  RefreshCw,
  Trash2,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { openExternal } from '@/lib/electron';
import { formatNumber, formatRelativeTime } from '@/lib/utils';

const categoryConfig = {
  ai: { label: 'AI/ML', variant: 'ai' as const, icon: '🤖' },
  web: { label: 'Web', variant: 'web' as const, icon: '🌐' },
  cli: { label: 'CLI', variant: 'cli' as const, icon: '⌨️' },
  library: { label: 'Library', variant: 'library' as const, icon: '📦' },
  other: { label: 'Other', variant: 'secondary' as const, icon: '📁' },
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: project, isLoading, refetch } = trpc.projects.get.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const { data: issues } = trpc.analysis.getIssues.useQuery(
    { projectId: id! },
    { enabled: !!id }
  );

  const { data: analysisHistory } = trpc.analysis.history.useQuery(
    { projectId: id! },
    { enabled: !!id }
  );

  const startAnalysis = trpc.analysis.start.useMutation({
    onSuccess: () => refetch(),
  });

  const removeProject = trpc.projects.remove.useMutation({
    onSuccess: () => navigate('/'),
  });

  const handleAnalyze = async () => {
    if (id) {
      await startAnalysis.mutateAsync({ projectId: id, type: 'typo' });
    }
  };

  const handleRemove = async () => {
    if (id && confirm(t('projects.confirmDelete'))) {
      await removeProject.mutateAsync({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground">{t('projects.notFound')}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const category = categoryConfig[project.category] || categoryConfig.other;
  const topLanguages = project.languages
    ? Object.entries(project.languages as Record<string, number>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  const openIssues = issues?.filter((i) => i.status === 'open') || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 titlebar-drag">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="titlebar-no-drag"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{category.icon}</span>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge variant={category.variant}>{category.label}</Badge>
              {project.source === 'github' && project.githubUrl && (
                <button
                  onClick={() => openExternal(project.githubUrl!)}
                  className="titlebar-no-drag"
                >
                  <ExternalLink className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            {project.description && (
              <p className="mt-1 text-muted-foreground">{project.description}</p>
            )}
          </div>
          <div className="flex gap-2 titlebar-no-drag">
            <Button
              variant="outline"
              onClick={handleRemove}
              disabled={removeProject.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common.delete')}
            </Button>
            <Button onClick={handleAnalyze} disabled={startAnalysis.isPending}>
              {startAnalysis.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {project.lastAnalyzed ? t('projects.reanalyze') : t('projects.analyze')}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('projects.details.info')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.source === 'github' && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>{formatNumber(project.githubStars || 0)} stars</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <GitFork className="h-4 w-4" />
                    <span>{formatNumber(project.githubForks || 0)} forks</span>
                  </div>
                </>
              )}
              {project.source === 'local' && project.localPath && (
                <div className="flex items-center gap-2 text-sm">
                  <FolderOpen className="h-4 w-4" />
                  <span className="truncate">{project.localPath}</span>
                </div>
              )}
              {project.lastAnalyzed && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {t('projects.details.lastAnalyzed')}: {formatRelativeTime(project.lastAnalyzed)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {t('projects.details.issuesFound')}: {project.issuesFound || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Languages */}
          <Card>
            <CardHeader>
              <CardTitle>{t('projects.details.languages')}</CardTitle>
            </CardHeader>
            <CardContent>
              {topLanguages.length > 0 ? (
                <div className="space-y-2">
                  {topLanguages.map(([lang, percentage]) => (
                    <div key={lang} className="flex items-center gap-2">
                      <span className="text-sm font-medium w-24 truncate">{lang}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('projects.details.noLanguages')}</p>
              )}
            </CardContent>
          </Card>

          {/* Analysis History */}
          <Card>
            <CardHeader>
              <CardTitle>{t('projects.details.analysisHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              {analysisHistory && analysisHistory.length > 0 ? (
                <div className="space-y-2">
                  {analysisHistory.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            task.status === 'completed'
                              ? 'default'
                              : task.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {task.status}
                        </Badge>
                        <span className="text-muted-foreground">
                          {task.issuesFound} issues
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(task.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('projects.details.noHistory')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Issues List */}
        {openIssues.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>
                {t('projects.details.openIssues')} ({openIssues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-auto">
                {openIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-start gap-3 p-3 bg-muted rounded-lg"
                  >
                    <AlertCircle className="h-4 w-4 mt-1 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground">
                          {issue.filePath}:{issue.line}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {issue.type}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{issue.message}</p>
                      {issue.original && issue.suggestion && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <code className="text-red-500 line-through">{issue.original}</code>
                          {' → '}
                          <code className="text-green-500">{issue.suggestion}</code>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
