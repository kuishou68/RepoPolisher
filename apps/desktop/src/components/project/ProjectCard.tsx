import { Star, GitFork, Clock, AlertCircle, FolderOpen, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import { openExternal } from '@/lib/electron';

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description?: string | null;
    source: 'github' | 'local';
    category: 'ai' | 'web' | 'cli' | 'library' | 'other';
    githubStars?: number | null;
    githubForks?: number | null;
    githubUrl?: string | null;
    localPath?: string | null;
    lastAnalyzed?: Date | null;
    issuesFound?: number | null;
    languages?: Record<string, number> | null;
  };
  onAnalyze?: () => void;
  onView?: () => void;
}

const categoryConfig = {
  ai: { label: 'AI/ML', variant: 'ai' as const, icon: '🤖' },
  web: { label: 'Web', variant: 'web' as const, icon: '🌐' },
  cli: { label: 'CLI', variant: 'cli' as const, icon: '⌨️' },
  library: { label: 'Library', variant: 'library' as const, icon: '📦' },
  other: { label: 'Other', variant: 'secondary' as const, icon: '📁' },
};

export function ProjectCard({ project, onAnalyze, onView }: ProjectCardProps) {
  const category = categoryConfig[project.category] || categoryConfig.other;
  const topLanguages = project.languages
    ? Object.entries(project.languages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([lang]) => lang)
    : [];

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{category.icon}</span>
              <h3 className="font-semibold truncate">{project.name}</h3>
              {project.source === 'github' && project.githubUrl && (
                <button
                  onClick={() => openExternal(project.githubUrl!)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            {project.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
          <Badge variant={category.variant}>{category.label}</Badge>
        </div>

        {/* Stats */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {project.source === 'github' && (
            <>
              {project.githubStars != null && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  {formatNumber(project.githubStars)}
                </span>
              )}
              {project.githubForks != null && (
                <span className="flex items-center gap-1">
                  <GitFork className="h-4 w-4" />
                  {formatNumber(project.githubForks)}
                </span>
              )}
            </>
          )}
          {project.source === 'local' && project.localPath && (
            <span className="flex items-center gap-1 truncate max-w-48">
              <FolderOpen className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{project.localPath}</span>
            </span>
          )}
          {project.lastAnalyzed && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatRelativeTime(project.lastAnalyzed)}
            </span>
          )}
          {(project.issuesFound ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              {project.issuesFound} issues
            </span>
          )}
        </div>

        {/* Languages */}
        {topLanguages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {topLanguages.map((lang) => (
              <Badge key={lang} variant="outline" className="text-xs">
                {lang}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
            View Details
          </Button>
          <Button size="sm" className="flex-1" onClick={onAnalyze}>
            {project.lastAnalyzed ? 'Re-analyze' : 'Analyze'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
