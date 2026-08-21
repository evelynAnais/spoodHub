import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, deleteEvent, eventsForSpider, logEvent, type EventType } from '../../lib/db';
import { formatDateTime } from '../../lib/format';
import { assessMolt, STATUS_META } from '../../lib/premolt';
import { LogForm } from './LogForm';
import { Badge, Button, Card, TONE_CLASSES } from './ui';

/**
 * The screen an enclosure tag opens. Optimised for one hand at the shelf: the
 * common cases (ate / refused) are a single tap with an undo, and everything
 * else is behind "More options".
 */
export default function QuickLog() {
  const spiderId =
    typeof window === 'undefined' ? null : new URLSearchParams(location.search).get('s');

  const spider = useLiveQuery(
    () => (spiderId ? db.spiders.get(spiderId) : undefined),
    [spiderId],
  );
  const events = useLiveQuery(
    () => (spiderId ? eventsForSpider(spiderId) : []),
    [spiderId],
  );

  const [lastLoggedId, setLastLoggedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<EventType | null>(null);

  if (!spiderId) {
    return (
      <Card>
        <h1 className="font-semibold">No spider in this link</h1>
        <p className="mt-2 text-sm text-muted">
          This page expects a link like <code>/log?s=…</code>, which is what an enclosure tag
          contains.
        </p>
        <div className="mt-4">
          <a href="/track" className="text-accent hover:underline">
            Go to the tracker →
          </a>
        </div>
      </Card>
    );
  }

  if (spider === undefined && events === undefined) {
    return <p className="py-12 text-center text-muted">Loading…</p>;
  }

  if (!spider) {
    return (
      <Card>
        <h1 className="font-semibold">Not on this device</h1>
        <p className="mt-2 text-sm text-muted">
          That tag points at a spider this browser has no record of. Your log is stored per-device,
          so a tag written from another phone will not resolve here until you import that device’s
          backup.
        </p>
        <div className="mt-4">
          <a href="/track" className="text-accent hover:underline">
            Go to the tracker →
          </a>
        </div>
      </Card>
    );
  }

  const history = events ?? [];
  const assessment = assessMolt(spider, history);
  const meta = STATUS_META[assessment.status];
  const lastFeed = history.find((e) => e.type === 'feed');
  const defaultPrey = lastFeed?.prey ?? 'Blue bottle fly';
  const warnAboutFeeding =
    assessment.status === 'in-premolt' || assessment.status === 'post-molt';

  async function quickFeed(accepted: boolean) {
    const id = await logEvent({
      spiderId: spider!.id,
      type: 'feed',
      at: new Date().toISOString(),
      prey: defaultPrey,
      preySize: lastFeed?.preySize ?? 'medium',
      accepted,
    });
    setLastLoggedId(id);
  }

  const justLogged = lastLoggedId ? history.find((e) => e.id === lastLoggedId) : undefined;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">{spider.name}</h1>
        <p className="text-sm text-muted">
          {spider.speciesName ?? spider.speciesSlug?.replace(/-/g, ' ') ?? 'Quick log'}
        </p>
      </header>

      <div className={`rounded-xl border p-3 ${TONE_CLASSES[meta.tone] ?? TONE_CLASSES.muted}`}>
        <div className="flex items-center gap-2">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <span className="text-sm font-medium">{assessment.headline}</span>
        </div>
        {warnAboutFeeding ? <p className="mt-2 text-sm">{assessment.advice}</p> : null}
      </div>

      {justLogged ? (
        <div className="flex items-center gap-3 rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm">
          <span className="flex-1 text-fg">
            Logged at {formatDateTime(justLogged.at)}.
          </span>
          <button
            type="button"
            onClick={() => {
              void deleteEvent(justLogged.id).then(() => setLastLoggedId(null));
            }}
            className="font-medium text-accent hover:underline"
          >
            Undo
          </button>
        </div>
      ) : null}

      {expanded === null ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void quickFeed(true)}
              className="rounded-xl border border-ok/40 bg-ok/10 px-4 py-8 text-lg font-semibold text-ok transition active:scale-[0.98]"
            >
              Ate it
            </button>
            <button
              type="button"
              onClick={() => void quickFeed(false)}
              className="rounded-xl border border-watch/40 bg-watch/10 px-4 py-8 text-lg font-semibold text-watch transition active:scale-[0.98]"
            >
              Refused
            </button>
          </div>
          <p className="text-center text-xs text-muted">
            One tap logs {defaultPrey.toLowerCase()} at the current time.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button onClick={() => setExpanded('molt')}>Log a molt</Button>
            <Button onClick={() => setExpanded('behavior')}>Log behavior</Button>
          </div>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setExpanded('feed')}
              className="text-sm text-accent hover:underline"
            >
              More options
            </button>
          </div>
        </div>
      ) : (
        <Card>
          <LogForm spider={spider} defaultType={expanded} onDone={() => setExpanded(null)} />
        </Card>
      )}

      <div className="border-t border-line pt-4 text-center">
        <a href={`/track?s=${spider.id}`} className="text-sm text-accent hover:underline">
          Open full record for {spider.name} →
        </a>
      </div>
    </div>
  );
}
