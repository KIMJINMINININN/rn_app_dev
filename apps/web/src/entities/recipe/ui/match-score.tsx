import { MIN_SCORE, SCORE_READY_THRESHOLD } from '../lib/scoring-constants';

interface Props {
  score: number;
  compact?: boolean;
}

export function MatchScore({ score, compact = false }: Props) {
  const pct = Math.round(score * 100);

  const colorClass =
    score >= SCORE_READY_THRESHOLD
      ? 'bg-emerald-500'
      : score >= MIN_SCORE
        ? 'bg-amber-400'
        : 'bg-gray-300';

  const labelColorClass =
    score >= SCORE_READY_THRESHOLD
      ? 'text-emerald-700'
      : score >= MIN_SCORE
        ? 'text-amber-700'
        : 'text-gray-500';

  if (compact) {
    return (
      <div className="flex flex-col items-end gap-2">
        <span className={`text-body-xs-400 ${labelColorClass}`}>{pct}%</span>
        <div className="h-4 w-40 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${colorClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-body-xs-400 text-gray-500">매칭률</span>
        <span className={`text-body-s-500 ${labelColorClass}`}>{pct}%</span>
      </div>
      <div className="h-6 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
