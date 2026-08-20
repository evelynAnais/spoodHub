import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, requestPersistentStorage, type TrackEvent } from '../../lib/db';
import type { SpeciesOption } from '../../lib/species';
import { BackupNag, BackupPanel } from './BackupPanel';
import { SpiderDetail } from './SpiderDetail';
import { ArchivedList, SpiderList } from './SpiderList';
import { SpiderForm } from './SpiderForm';
import { Button, Card } from './ui';

type View = { name: 'list' } | { name: 'new' } | { name: 'detail'; id: string };

function viewFromUrl(): View {
  const id = new URLSearchParams(location.search).get('s');
  return id ? { name: 'detail', id } : { name: 'list' };
}

export default function TrackerApp({ speciesOptions }: { speciesOptions: SpeciesOption[] }) {
  const [view, setView] = useState<View>(viewFromUrl);
  const [showBackup, setShowBackup] = useState(false);

  const spiders = useLiveQuery(() => db.spiders.toArray(), []);
  const events = useLiveQuery(() => db.events.toArray(), []);

  // Ask the browser not to evict this data if the device gets low on space.
  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  // Keep the back button working with the in-island navigation.
  useEffect(() => {
    const onPop = () => setView(viewFromUrl());
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  function navigate(next: View) {
    setView(next);
    const url = next.name === 'detail' ? `?s=${next.id}` : location.pathname;
    history.pushState(null, '', url);
  }

  if (!spiders || !events) {
    return <p className="py-12 text-center text-muted">Loading your log…</p>;
  }

  const eventsBySpider = new Map<string, TrackEvent[]>();
  for (const event of events) {
    const list = eventsBySpider.get(event.spiderId);
    if (list) list.push(event);
    else eventsBySpider.set(event.spiderId, [event]);
  }

  if (view.name === 'detail') {
    const spider = spiders.find((s) => s.id === view.id);
    if (!spider) {
      return (
        <Card>
          <h2 className="font-semibold">Spider not found on this device</h2>
          <p className="mt-2 text-sm text-muted">
            That link points at a spider this browser does not have. Your log is stored per-device,
            so a link made on your phone will not resolve on a different device unless you have
            imported a backup there.
          </p>
          <div className="mt-4">
            <Button onClick={() => navigate({ name: 'list' })}>Back to all spiders</Button>
          </div>
        </Card>
      );
    }
    return (
      <SpiderDetail
        spider={spider}
        speciesOptions={speciesOptions}
        onBack={() => navigate({ name: 'list' })}
      />
    );
  }

  if (view.name === 'new') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate({ name: 'list' })}>
          ← All spiders
        </Button>
        <Card>
          <h1 className="mb-4 text-lg font-semibold">Add a spider</h1>
          <SpiderForm
            speciesOptions={speciesOptions}
            onDone={(id) => navigate({ name: 'detail', id })}
            onCancel={() => navigate({ name: 'list' })}
          />
        </Card>
      </div>
    );
  }

  const active = spiders.filter((s) => s.archived === 0);
  const archived = spiders.filter((s) => s.archived === 1);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Your spiders</h1>
          <p className="text-sm text-muted">
            {active.length === 0
              ? 'Stored on this device only.'
              : `${active.length} tracked · stored on this device only`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowBackup((v) => !v)}>
            {showBackup ? 'Hide backup' : 'Backup'}
          </Button>
          <Button variant="primary" onClick={() => navigate({ name: 'new' })}>
            Add spider
          </Button>
        </div>
      </header>

      <BackupNag />
      {showBackup ? <BackupPanel /> : null}

      <SpiderList
        spiders={active}
        eventsBySpider={eventsBySpider}
        onSelect={(id) => navigate({ name: 'detail', id })}
      />

      <ArchivedList spiders={archived} onSelect={(id) => navigate({ name: 'detail', id })} />
    </div>
  );
}
