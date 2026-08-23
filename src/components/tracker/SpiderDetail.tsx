import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { archiveSpider, deleteSpiderForever, eventsForSpider, type Spider } from '../../lib/db';
import { formatDate, humanizeTag, relativeDays } from '../../lib/format';
import { openHealthConcerns } from '../../lib/health';
import { assessMolt, STATUS_META } from '../../lib/premolt';
import type { SpeciesOption } from '../../lib/species';
import { EventTimeline } from './EventTimeline';
import { LogForm } from './LogForm';
import { SpiderForm } from './SpiderForm';
import { TagPanel } from './TagPanel';
import { Badge, Button, Card, Stat, TONE_CLASSES } from './ui';

export function SpiderDetail({
  spider,
  speciesOptions,
  onBack,
}: {
  spider: Spider;
  speciesOptions: SpeciesOption[];
  onBack: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const events = useLiveQuery(() => eventsForSpider(spider.id), [spider.id]);

  const species = speciesOptions.find((option) => option.slug === spider.speciesSlug);
  const assessment = assessMolt(spider, events ?? []);
  const meta = STATUS_META[assessment.status];

  const moltCount = (events ?? []).filter((e) => e.type === 'molt').length;
  const feedCount = (events ?? []).filter((e) => e.type === 'feed').length;
  const openConcerns = openHealthConcerns(events ?? []);

  if (editing) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setEditing(false)}>
          ← Back to {spider.name}
        </Button>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Edit {spider.name}</h2>
          <SpiderForm
            speciesOptions={speciesOptions}
            existing={spider}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack}>
        ← All spiders
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{spider.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {species ? (
              <a href={`/species/${species.slug}`} className="text-accent hover:underline">
                {species.commonName}
              </a>
            ) : (
              (spider.speciesName ?? 'Species not recorded')
            )}
            {spider.sex !== 'unknown' ? ` · ${spider.sex}` : ''}
            {spider.instar ? ` · instar ${spider.instar}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setEditing(true)}>Edit</Button>
        </div>
      </header>

      {/* The whole reason to open the app. */}
      <div className={`rounded-xl border p-4 ${TONE_CLASSES[meta.tone] ?? TONE_CLASSES.muted}`}>
        <div className="flex items-center gap-2">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <span className="font-semibold">{assessment.headline}</span>
        </div>
        <p className="mt-2 text-sm text-fg">{assessment.advice}</p>
        {assessment.reasons.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {assessment.reasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {openConcerns.length > 0 ? (
        <div className="rounded-xl border border-alert/30 bg-alert/10 p-4">
          <h2 className="font-semibold text-alert">
            Open health {openConcerns.length === 1 ? 'concern' : 'concerns'}
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {openConcerns.map((item) => (
              <li key={item.concern}>
                <strong>{humanizeTag(item.concern)}</strong>
                <span className="text-muted"> — logged {relativeDays(item.since)}</span>
                {item.notes ? <div className="text-xs text-muted">{item.notes}</div> : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Log another Health entry for the same concern with “Already resolved” ticked to clear
            it.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Since last feed"
          value={assessment.daysSinceLastFeed === null ? '—' : `${assessment.daysSinceLastFeed}d`}
        />
        <Stat
          label="Since last molt"
          value={assessment.daysSinceLastMolt === null ? '—' : `${assessment.daysSinceLastMolt}d`}
        />
        <Stat label="Molts logged" value={moltCount} />
        <Stat label="Feedings" value={feedCount} />
      </div>

      {assessment.estimatedNextMolt ? (
        <p className="text-sm text-muted">
          Next molt estimated around{' '}
          <strong className="text-fg">{formatDate(assessment.estimatedNextMolt)}</strong>
          {assessment.expectedIntervalDays
            ? ` (${assessment.expectedIntervalDays}-day interval${
                moltCount >= 3 ? ', from this spider’s own history' : ', rough default'
              })`
            : null}
          .
        </p>
      ) : null}

      <Card>
        <h2 className="mb-4 font-semibold">Log something</h2>
        <LogForm spider={spider} />
      </Card>

      <section>
        <h2 className="mb-3 font-semibold">History</h2>
        <EventTimeline events={events ?? []} spider={spider} />
      </section>

      {spider.notes ? (
        <Card>
          <h2 className="mb-2 font-semibold">Notes</h2>
          <p className="text-sm whitespace-pre-wrap text-muted">{spider.notes}</p>
        </Card>
      ) : null}

      <TagPanel spider={spider} />

      <Card className="border-line">
        <h2 className="mb-1 font-semibold">Manage</h2>
        <p className="mb-3 text-sm text-muted">
          Archiving hides {spider.name} from the list but keeps the full history. Deleting removes
          the spider and every entry permanently.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              void archiveSpider(spider.id).then(onBack);
            }}
          >
            Archive
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (
                confirm(
                  `Permanently delete ${spider.name} and all ${(events ?? []).length} log entries? This cannot be undone.`,
                )
              ) {
                void deleteSpiderForever(spider.id).then(onBack);
              }
            }}
          >
            Delete forever
          </Button>
        </div>
      </Card>

      <p className="text-xs text-muted">
        Added {spider.acquiredAt ? relativeDays(spider.acquiredAt) : relativeDays(spider.createdAt)}
        {spider.source ? ` · ${spider.source}` : ''}
      </p>
    </div>
  );
}
