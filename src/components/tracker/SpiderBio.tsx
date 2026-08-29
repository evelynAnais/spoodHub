import type { Spider, TrackEvent } from '../../lib/db';
import { daysAgo, formatDate, relativeDays } from '../../lib/format';
import type { SpeciesOption } from '../../lib/species';
import { Card } from './ui';

export function SpiderBio({
  spider,
  events,
  species,
}: {
  spider: Spider;
  events: TrackEvent[];
  species?: SpeciesOption;
}) {
  const molts = events
    .filter((e) => e.type === 'molt')
    .sort((a, b) => a.at.localeCompare(b.at));

  const facts: { label: string; value: React.ReactNode }[] = [];

  facts.push({
    label: 'Species',
    value: species ? (
      <a href={`/species/${species.slug}`} className="text-accent hover:underline">
        {species.commonName}
      </a>
    ) : (
      (spider.speciesName ?? <span className="text-muted">not recorded</span>)
    ),
  });

  facts.push({
    label: 'Sex',
    value:
      spider.sex === 'unknown' ? <span className="text-muted">unknown</span> : spider.sex,
  });

  if (spider.acquiredAt) {
    facts.push({
      label: 'Acquired',
      value: (
        <>
          {formatDate(spider.acquiredAt)}
          <span className="text-muted"> · {relativeDays(spider.acquiredAt)}</span>
        </>
      ),
    });
  }

  if (spider.source) facts.push({ label: 'Source', value: spider.source });

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">About {spider.name}</h2>

      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label} className="flex gap-2 text-sm">
            <dt className="w-20 shrink-0 text-muted">{fact.label}</dt>
            <dd className="min-w-0 flex-1 capitalize">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {spider.notes ? (
        <div className="border-t border-line pt-3">
          <h3 className="text-xs font-medium tracking-wide text-muted uppercase">Notes</h3>
          <p className="mt-1.5 text-sm whitespace-pre-wrap">{spider.notes}</p>
        </div>
      ) : null}

      <div className="border-t border-line pt-3">
        <h3 className="text-xs font-medium tracking-wide text-muted uppercase">Instar history</h3>

        {molts.length === 0 && spider.instar === undefined ? (
          <p className="mt-1.5 text-sm text-muted">
            No instar recorded and no molts logged yet. Record one when {spider.name} molts and a
            history builds from there.
          </p>
        ) : (
          <ol className="mt-3">
            {molts.map((molt, i) => {
              const previous = i > 0 ? molts[i - 1] : null;
              const heldDays = previous ? daysAgo(previous.at, new Date(molt.at)) : null;

              return (
                <li key={molt.id} className="relative flex gap-3 pb-4 last:pb-0">
                  <span aria-hidden="true" className="absolute top-4 bottom-0 left-[5px] w-px bg-line" />
                  <span aria-hidden="true" className="relative mt-1 size-2.5 shrink-0 rounded-full bg-line ring-2 ring-surface" />

                  <div className="min-w-0 flex-1 -mt-0.5">
                    <p className="text-sm">
                      <span className="font-medium">
                        {molt.newInstar ? `Instar ${molt.newInstar}` : 'Molted'}
                      </span>
                      <span className="text-muted"> · {formatDate(molt.at)}</span>
                    </p>
                    {/* The gap between molts is the number a keeper actually
                        wants: it is what the pre-molt estimate is built from. */}
                    {heldDays !== null ? (
                      <p className="text-xs text-muted">held {heldDays} days</p>
                    ) : null}
                  </div>
                </li>
              );
            })}

            <li className="relative flex gap-3">
              <span aria-hidden="true" className="relative mt-1 size-2.5 shrink-0 rounded-full bg-accent ring-2 ring-surface" />
              <div className="min-w-0 flex-1 -mt-0.5">
                <p className="text-sm">
                  <span className="font-medium text-accent">
                    {spider.instar ? `Instar ${spider.instar}` : 'Current'}
                  </span>
                  <span className="text-muted"> · current</span>
                </p>
                <p className="text-xs text-muted">
                  {molts.length > 0
                    ? `${daysAgo(molts[molts.length - 1].at)} days so far`
                    : `recorded when ${spider.name} was added`}
                </p>
              </div>
            </li>
          </ol>
        )}
      </div>
    </Card>
  );
}
