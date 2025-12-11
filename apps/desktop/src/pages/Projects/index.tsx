import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, FolderOpen, Github, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectCard } from '@/components/project/ProjectCard';
import { trpc } from '@/lib/trpc';
import { openDirectory } from '@/lib/electron';

type SourceFilter = 'all' | 'github' | 'local';
type CategoryFilter = 'all' | 'ai' | 'web' | 'cli' | 'library' | 'other';

export function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery({
    source: sourceFilter === 'all' ? undefined : sourceFilter,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    search: searchQuery || undefined,
  });

  const { data: stats } = trpc.projects.stats.useQuery();

  const fetchTrending = trpc.projects.fetchTrending.useMutation({
    onSuccess: () => refetch(),
  });

  const addLocal = trpc.projects.addLocal.useMutation({
    onSuccess: () => refetch(),
  });

  const startAnalysis = trpc.analysis.start.useMutation();

  const handleAddLocal = async () => {
    const path = await openDirectory();
    if (path) {
      await addLocal.mutateAsync({ path });
    }
  };

  const handleFetchTrending = () => {
    fetchTrending.mutate({ category: 'ai', limit: 30 });
  };

  const handleAnalyze = async (projectId: string) => {
    await startAnalysis.mutateAsync({ projectId, type: 'typo' });
    refetch();
  };

  const sourceLabels: Record<SourceFilter, string> = {
    all: t('projects.filters.all'),
    github: t('projects.filters.github'),
    local: t('projects.filters.local'),
  };

  const categoryLabels: Record<CategoryFilter, string> = {
    all: t('projects.filters.all'),
    ai: t('projects.filters.ai'),
    web: t('projects.filters.web'),
    cli: t('projects.filters.cli'),
    library: t('projects.filters.library'),
    other: t('projects.filters.other'),
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 titlebar-drag">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('projects.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('projects.stats', { total: stats?.total ?? 0, withIssues: stats?.withIssues ?? 0 })}
            </p>
          </div>
          <div className="flex gap-2 titlebar-no-drag">
            <Button variant="outline" onClick={handleAddLocal} disabled={addLocal.isPending}>
              <FolderOpen className="mr-2 h-4 w-4" />
              {t('projects.addLocal')}
            </Button>
            <Button onClick={handleFetchTrending} disabled={fetchTrending.isPending}>
              {fetchTrending.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Github className="mr-2 h-4 w-4" />
              )}
              {t('projects.fetchTrending')}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('projects.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Source Filter */}
        <div className="flex gap-2">
          <span className="text-sm font-medium text-muted-foreground mr-2">{t('projects.source')}:</span>
          {(['all', 'github', 'local'] as const).map((source) => (
            <Button
              key={source}
              variant={sourceFilter === source ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSourceFilter(source)}
            >
              {sourceLabels[source]}
              {source !== 'all' && stats && (
                <Badge variant="secondary" className="ml-2">
                  {stats.bySource[source]}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground mr-2">{t('projects.category')}:</span>
          {(['all', 'ai', 'web', 'cli', 'library', 'other'] as const).map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
            >
              {categoryLabels[cat]}
              {cat !== 'all' && stats && (
                <Badge variant="secondary" className="ml-2">
                  {stats.byCategory[cat]}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Project Grid */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onView={() => navigate(`/projects/${project.id}`)}
                onAnalyze={() => handleAnalyze(project.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">{t('projects.empty.title')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('projects.empty.description')}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleAddLocal}>
                <Plus className="mr-2 h-4 w-4" />
                {t('projects.empty.addLocal')}
              </Button>
              <Button onClick={handleFetchTrending}>
                <Github className="mr-2 h-4 w-4" />
                {t('projects.fetchTrending')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
