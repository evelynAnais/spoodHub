import type { Spider, TrackEvent } from '../../lib/db';
import { openHealthConcerns } from '../../lib/health';
import { assessMolt } from '../../lib/premolt';

export function TrackerSummary({
  spiders,
  eventsBySpider,
}: {
  spiders: Spider[];
  eventsBySpider: Map<string, TrackEvent[]>;
}) {
  if (spiders.length === 0) return null;

  let premolt = 0;
  let health = 0;
  let dueFood = 0;
  let resting = 0;

  for (const spider of spiders) {
    const events = eventsBySpider.get(spider.id) ?? [];
    const assessment = assessMolt(spider, events);

    if (assessment.status === 'in-premolt') premolt += 1;
    if (assessment.status === 'post-molt') resting += 1;
    if (openHealthConcerns(events).length > 0) health += 1;

    // assessMolt already excludes the states in which feeding is wrong, so
    // this cannot contradict what the spider's own page says.
    if (assessment.feedingDue) dueFood += 1;
  }

  const needsAttention = premolt + health;

  const tiles = [
    {
      value: spiders.length,
      label: spiders.length === 1 ? 'spider tracked' : 'spiders tracked',
      tone: 'bg-raised border-line text-fg',
    },
    {
      value: dueFood,
      label: dueFood === 1 ? 'due a feeding' : 'due a feeding',
      tone: dueFood > 0 ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-raised border-line text-muted',
    },
    {
      value: needsAttention,
      label: needsAttention === 1 ? 'needs attention' : 'need attention',
      tone:
        needsAttention > 0
          ? 'bg-alert/10 border-alert/40 text-alert'
          : 'bg-raised border-line text-muted',
    },
  ];

  return (
    <section aria-label="At a glance">
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {tiles.map((tile) => (
          <li
            key={tile.label}
            className={`rounded-xl border px-3 py-4 text-center transition ${tile.tone}`}
          >
            <p className="text-3xl font-bold tabular-nums">{tile.value}</p>
            <p className="mt-0.5 text-xs">{tile.label}</p>
          </li>
        ))}
      </ul>

      {needsAttention > 0 || resting > 0 ? (
        <p className="mt-2 text-xs text-muted">
          {[
            premolt > 0 && `${premolt} in pre-molt — do not offer prey`,
            health > 0 && `${health} with an open health concern`,
            resting > 0 && `${resting} recently molted — wait before feeding`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
    </section>
  );
}
