import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GitPullRequest, ExternalLink, Trash2, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { openExternal } from '@/lib/electron';
import { formatRelativeTime } from '@/lib/utils';

export function PRsPage() {
  const { t } = useTranslation();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [submitFeedback, setSubmitFeedback] = useState<
    Record<
      string,
      { type: 'success' | 'error'; message: string; prUrl?: string; warnings?: string[] }
    >
  >({});

  const { data: projects } = trpc.projects.list.useQuery({});
  const { data: drafts, refetch } = trpc.pr.listDrafts.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const submitPR = trpc.pr.submit.useMutation({
    onSuccess: (result, variables) => {
      if (result.success) {
        const message = result.warnings?.length
          ? t('prs.submitSuccessWithWarnings', { count: result.warnings.length })
          : t('prs.submitSuccess');
        setSubmitFeedback((prev) => ({
          ...prev,
          [variables.draftId]: {
            type: 'success',
            message,
            prUrl: result.prUrl,
            warnings: result.warnings,
          },
        }));
        refetch();
      } else {
        setSubmitFeedback((prev) => ({
          ...prev,
          [variables.draftId]: {
            type: 'error',
            message: result.error || t('prs.submitFailure'),
          },
        }));
      }
    },
    onError: (error, variables) => {
      setSubmitFeedback((prev) => ({
        ...prev,
        [variables.draftId]: {
          type: 'error',
          message: error.message || t('prs.submitFailure'),
        },
      }));
    },
  });

  const deleteDraft = trpc.pr.deleteDraft.useMutation({
    onSuccess: () => refetch(),
  });

  const projectsWithPRs = projects?.filter((p) => (p.issuesFound ?? 0) > 0) ?? [];

  const statusConfig = {
    draft: { label: t('prs.status.draft'), variant: 'secondary' as const },
    ready: { label: t('prs.status.ready'), variant: 'default' as const },
    submitted: { label: t('prs.status.submitted'), variant: 'success' as const },
    merged: { label: t('prs.status.merged'), variant: 'success' as const },
    closed: { label: t('prs.status.closed'), variant: 'destructive' as const },
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 titlebar-drag">
        <h1 className="text-2xl font-bold">{t('prs.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('prs.subtitle')}
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Project List */}
        <div className="w-64 border-r overflow-auto">
          <div className="p-2">
            <h3 className="px-2 py-1 text-sm font-semibold text-muted-foreground">
              {t('prs.projectsWithIssues', { count: projectsWithPRs.length })}
            </h3>
            {projectsWithPRs.map((project) => (
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
                  {t('prs.issuesCount', { count: project.issuesFound })}
                </div>
              </button>
            ))}
            {projectsWithPRs.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                {t('prs.noProjectsWithIssues')}
              </p>
            )}
          </div>
        </div>

        {/* PR Drafts */}
        <div className="flex-1 overflow-auto">
          {selectedProjectId && drafts ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{t('prs.drafts', { count: drafts.length })}</h3>
              </div>
              {drafts.length > 0 ? (
                drafts.map((draft) => {
                  const status = statusConfig[draft.status] || statusConfig.draft;
                  return (
                    <Card key={draft.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{draft.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {t('prs.branch')}: {draft.branch} → {draft.baseBranch}
                            </p>
                          </div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground mb-4">
                          <p>{t('prs.issuesIncluded', { count: (draft.issueIds as string[] | null)?.length ?? 0 })}</p>
                          <p>{t('prs.created', { time: formatRelativeTime(draft.createdAt) })}</p>
                        </div>

                        {draft.prUrl && (
                          <div className="mb-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openExternal(draft.prUrl!)}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              {t('prs.viewPR', { number: draft.prNumber })}
                            </Button>
                          </div>
                        )}

                      <div className="flex gap-2">
                        {draft.status === 'draft' && (
                          <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteDraft.mutate({ draftId: draft.id })}
                                disabled={deleteDraft.isPending}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('prs.delete')}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  submitPR.mutate({ draftId: draft.id, method: 'gh-cli' })
                                }
                                disabled={submitPR.isPending}
                              >
                                {submitPR.isPending ? (
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            {t('prs.submitPR')}
                          </Button>
                        </>
                      )}
                    </div>
                    {submitFeedback[draft.id] && (
                      <div
                        className={`mt-3 text-sm ${
                          submitFeedback[draft.id].type === 'success'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        <span>{submitFeedback[draft.id].message}</span>
                        {submitFeedback[draft.id].type === 'success' &&
                          submitFeedback[draft.id].prUrl && (
                            <Button
                              variant="link"
                              size="sm"
                              className="ml-2 px-0"
                              onClick={() => openExternal(submitFeedback[draft.id].prUrl!)}
                            >
                              <ExternalLink className="mr-1 h-4 w-4" />
                              {t('prs.viewSubmittedPR')}
                            </Button>
                          )}
                      </div>
                    )}
                    {submitFeedback[draft.id]?.warnings &&
                      submitFeedback[draft.id].warnings!.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-xs text-yellow-600">
                          {submitFeedback[draft.id].warnings!.map((warning, index) => (
                            <li key={`${draft.id}-warning-${index}`}>{warning}</li>
                          ))}
                        </ul>
                      )}
                  </CardContent>
                </Card>
              );
            })
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <GitPullRequest className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold">{t('prs.noDrafts')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('prs.noDraftsDescription')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <GitPullRequest className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">{t('prs.selectProject')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('prs.selectProjectDescription')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
