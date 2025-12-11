import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileCode,
  CheckCheck,
  XIcon,
  GitPullRequest,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IssueDiff } from '@/components/ui/IssueDiff';
import { trpc } from '@/lib/trpc';
import { openInEditor } from '@/lib/electron';

export function AnalysisPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);

  const { data: projects } = trpc.projects.list.useQuery({});
  const { data: typosStatus } = trpc.analysis.checkTypos.useQuery();
  const { data: authStatus } = trpc.analysis.checkAuth.useQuery();

  const { data: issues, refetch: refetchIssues } = trpc.analysis.getIssues.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const updateStatus = trpc.analysis.updateIssueStatus.useMutation({
    onSuccess: () => refetchIssues(),
  });

  const updateBatchStatus = trpc.analysis.updateBatchIssueStatus.useMutation({
    onSuccess: () => refetchIssues(),
  });
  const createDraft = trpc.pr.createDraft.useMutation({
    onSuccess: () => {
      setSelectedIssueIds([]);
      refetchIssues();
      navigate('/prs');
    },
  });

  const analyzedProjects = projects?.filter((p) => p.lastAnalyzed) ?? [];

  // Get project base path for opening files in editor
  const { data: projectPath } = trpc.analysis.getProjectPath.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const handleOpenInEditor = (filePath: string, line?: number | null) => {
    if (projectPath) {
      const fullPath = `${projectPath}/${filePath}`;
      openInEditor(fullPath, line ?? undefined);
    }
  };
  const openIssues = issues?.filter((i) => i.status === 'open') ?? [];
  const issueIdsFingerprint = useMemo(
    () => (issues ?? []).map((issue) => issue.id).join(','),
    [issues]
  );

  useEffect(() => {
    setSelectedIssueIds([]);
  }, [selectedProjectId, issueIdsFingerprint]);

  const toggleIssueSelection = (issueId: string) => {
    setSelectedIssueIds((prev) =>
      prev.includes(issueId) ? prev.filter((id) => id !== issueId) : [...prev, issueId]
    );
  };

  const eligibleIssues = useMemo(
    () => (issues ?? []).filter((issue) => ['open', 'included'].includes(issue.status)),
    [issues]
  );

  const handleCreateDraft = () => {
    if (!selectedProjectId || selectedIssueIds.length === 0) return;
    createDraft.mutate({ projectId: selectedProjectId, issueIds: selectedIssueIds });
  };

  const handleSelectAll = () => {
    setSelectedIssueIds(eligibleIssues.map((issue) => issue.id));
  };

  const handleIncludeAll = () => {
    if (openIssues.length > 0) {
      updateBatchStatus.mutate({
        issueIds: openIssues.map((i) => i.id),
        status: 'included',
      });
    }
  };

  const handleIgnoreAll = () => {
    if (openIssues.length > 0) {
      updateBatchStatus.mutate({
        issueIds: openIssues.map((i) => i.id),
        status: 'ignored',
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 titlebar-drag">
        <h1 className="text-2xl font-bold">{t('analysis.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('analysis.subtitle')}
        </p>
      </div>

      {/* Status Cards */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('analysis.typosCli')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {typosStatus?.available ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">{t('analysis.installed', { version: typosStatus.version })}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm">{t('analysis.notInstalled')}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('analysis.githubAuth')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {authStatus?.ghCli.authenticated ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">@{authStatus.ghCli.username}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm">{t('analysis.notAuthenticated')}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Project List */}
        <div className="w-64 border-r overflow-auto">
          <div className="p-2">
            <h3 className="px-2 py-1 text-sm font-semibold text-muted-foreground">
              {t('analysis.analyzedProjects', { count: analyzedProjects.length })}
            </h3>
            {analyzedProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedProjectId === project.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="font-medium truncate">{project.name}</div>
                <div className="text-xs opacity-70">
                  {t('analysis.issuesCount', { count: project.issuesFound ?? 0 })}
                </div>
              </button>
            ))}
            {analyzedProjects.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                {t('analysis.noAnalyzedProjects')}
              </p>
            )}
          </div>
        </div>

        {/* Issue List */}
        <div className="flex-1 overflow-auto">
          {selectedProjectId && issues ? (
            <div className="p-4 space-y-2">
              <div className="flex flex-col gap-2 mb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{t('analysis.issues', { count: issues.length })}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedIssueIds.length > 0 && (
                      <Badge variant="secondary">
                        {t('analysis.selectedCount', { count: selectedIssueIds.length })}
                      </Badge>
                    )}
                    {openIssues.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleIgnoreAll}
                          disabled={updateBatchStatus.isPending}
                        >
                          <XIcon className="mr-1 h-4 w-4" />
                          {t('analysis.ignoreAll', { count: openIssues.length })}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleIncludeAll}
                          disabled={updateBatchStatus.isPending}
                        >
                          <CheckCheck className="mr-1 h-4 w-4" />
                          {t('analysis.includeAll', { count: openIssues.length })}
                        </Button>
                      </>
                    )}
                    {eligibleIssues.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        disabled={eligibleIssues.length === selectedIssueIds.length}
                      >
                        <CheckCheck className="mr-1 h-4 w-4" />
                        {t('analysis.selectAllEligible', { count: eligibleIssues.length })}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={handleCreateDraft}
                      disabled={
                        selectedIssueIds.length === 0 || createDraft.isPending || !selectedProjectId
                      }
                    >
                      {createDraft.isPending ? (
                        <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <GitPullRequest className="mr-1 h-4 w-4" />
                      )}
                      {t('analysis.createDraft')}
                    </Button>
                  </div>
                </div>
                {selectedIssueIds.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('analysis.selectionHint')}
                  </p>
                )}
              </div>
              {issues.map((issue) => (
                <Card key={issue.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={selectedIssueIds.includes(issue.id)}
                            onChange={() => toggleIssueSelection(issue.id)}
                            disabled={!['open', 'included'].includes(issue.status)}
                            aria-label={t('analysis.selectIssue')}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <FileCode className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-mono truncate">
                              {issue.filePath}:{issue.line}
                            </span>
                          </div>
                          {issue.original && issue.suggestion && (
                            <IssueDiff
                              filePath={issue.filePath}
                              line={issue.line ?? 1}
                              original={issue.original}
                              suggestion={issue.suggestion}
                              context={issue.context}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          {projectPath && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleOpenInEditor(issue.filePath, issue.line)}
                              title={t('analysis.openInEditor')}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Badge
                            variant={
                              issue.status === 'open'
                                ? 'warning'
                                : issue.status === 'included'
                                ? 'default'
                                : issue.status === 'fixed'
                                ? 'success'
                                : 'secondary'
                            }
                          >
                            {t(`analysis.status.${issue.status}`)}
                          </Badge>
                        </div>
                        {issue.status === 'open' && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateStatus.mutate({
                                  issueId: issue.id,
                                  status: 'ignored',
                                })
                              }
                            >
                              {t('analysis.ignore')}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                updateStatus.mutate({
                                  issueId: issue.id,
                                  status: 'included',
                                })
                              }
                            >
                              {t('analysis.include')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">{t('analysis.selectProject')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('analysis.selectProjectDescription')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
