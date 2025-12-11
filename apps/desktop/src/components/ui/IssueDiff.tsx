interface IssueDiffProps {
  filePath: string;
  line: number;
  original: string;
  suggestion: string;
  context?: string | null;
}

export function IssueDiff({ original, suggestion }: IssueDiffProps) {
  return (
    <div className="issue-diff font-mono text-sm rounded overflow-hidden">
      <div className="diff-del bg-red-100 dark:bg-red-950/50 px-3 py-1.5 flex items-start gap-2">
        <span className="select-none text-red-400 dark:text-red-500 shrink-0">-</span>
        <span className="text-red-700 dark:text-red-300 break-all">{original}</span>
      </div>
      <div className="diff-ins bg-green-100 dark:bg-green-950/50 px-3 py-1.5 flex items-start gap-2">
        <span className="select-none text-green-400 dark:text-green-500 shrink-0">+</span>
        <span className="text-green-700 dark:text-green-300 break-all">{suggestion}</span>
      </div>
    </div>
  );
}
