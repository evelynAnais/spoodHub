import type { Spider, TrackEvent } from '../../lib/db';
import { relativeDays } from '../../lib/format';
import { openHealthConcerns } from '../../lib/health';
import { assessMolt, STATUS_META } from '../../lib/premolt';
import { Badge, EmptyState } from './ui';

/** Statuses that should float to the top of the list. */
const URGENCY: Record<string, number> = {
  'in-premolt': 0,
  'post-molt': 1,
  'likely-premolt': 2,
  'post-rehouse': 3,
  watch: 4,
  normal: 5,
  unknown: 6,
};

export function SpiderList({
  spiders,
  eventsBySpider,
  onSelect,
}: {
  spiders: Spider[];
  eventsBySpider: Map<string, TrackEvent[]>;
  onSelect: (id: string) => void;
}) {
  if (spiders.length === 0) {
    return (
      <EmptyState title="No spiders yet">
        Add your first one to start tracking feedings and molts.
      </EmptyState>
    );
  }

  const rows = spiders
    .map((spider) => {
      const events = eventsBySpider.get(spider.id) ?? [];
      return {
        spider,
        assessment: assessMolt(spider, events),
        openConcerns: openHealthConcerns(events).length,
      };
    })
    .sort((a, b) => {
      const byUrgency = URGENCY[a.assessment.status] - URGENCY[b.assessment.status];
      return byUrgency !== 0 ? byUrgency : a.spider.name.localeCompare(b.spider.name);
    });

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {rows.map(({ spider, assessment, openConcerns }) => {
        const meta = STATUS_META[assessment.status];
        return (
          <li key={spider.id}>
            <button
              type="button"
              onClick={() => onSelect(spider.id)}
              className="w-full rounded-xl border border-line bg-surface p-4 text-left transition hover:border-accent/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{spider.name}</h3>
                  <p className="truncate text-xs text-muted">
                    {spider.speciesName ?? spider.speciesSlug?.replace(/-/g, ' ') ?? 'Unknown species'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {openConcerns > 0 ? (
                    <Badge tone="alert">
                      {openConcerns} health {openConcerns === 1 ? 'issue' : 'issues'}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <p className="mt-3 text-sm text-muted">{assessment.headline}</p>

              <dl className="mt-3 flex gap-4 text-xs text-muted">
                <div>
                  <dt className="inline">Fed </dt>
                  <dd className="inline font-medium text-fg">
                    {assessment.daysSinceLastFeed === null
                      ? 'never'
                      : `${assessment.daysSinceLastFeed}d ago`}
                  </dd>
                </div>
                <div>
                  <dt className="inline">Molted </dt>
                  <dd className="inline font-medium text-fg">
                    {assessment.daysSinceLastMolt === null
                      ? 'never'
                      : `${assessment.daysSinceLastMolt}d ago`}
                  </dd>
                </div>
              </dl>

              {assessment.progress !== null ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${Math.min(100, Math.round(assessment.progress * 100))}%` }}
                  />
                </div>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ArchivedList({
  spiders,
  onSelect,
}: {
  spiders: Spider[];
  onSelect: (id: string) => void;
}) {
  if (spiders.length === 0) return null;
  return (
    <details className="rounded-xl border border-line bg-surface p-4">
      <summary className="cursor-pointer text-sm font-medium text-muted">
        Archived ({spiders.length})
      </summary>
      <ul className="mt-3 space-y-1">
        {spiders.map((spider) => (
          <li key={spider.id}>
            <button
              type="button"
              onClick={() => onSelect(spider.id)}
              className="text-sm text-accent hover:underline"
            >
              {spider.name}
            </button>
            <span className="ml-2 text-xs text-muted">
              added {relativeDays(spider.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
