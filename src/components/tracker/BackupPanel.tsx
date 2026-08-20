import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import {
  downloadBackup,
  getLastExportAt,
  importBackup,
  shouldNagForBackup,
  type ImportResult,
} from '../../lib/backup';
import { relativeDays } from '../../lib/format';
import { Button, Card } from './ui';

export function BackupNag() {
  const nag = useLiveQuery(() => shouldNagForBackup(), []);
  const [dismissed, setDismissed] = useState(false);
  if (!nag || dismissed) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-watch/30 bg-watch/10 px-4 py-3 text-sm">
      <span className="flex-1 text-fg">
        Your log lives only on this device. Save a backup so a cleared browser or a lost phone
        does not take it with them.
      </span>
      <Button
        variant="primary"
        onClick={() => {
          void downloadBackup();
        }}
      >
        Save backup
      </Button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-xs text-muted hover:text-fg"
      >
        Later
      </button>
    </div>
  );
}

export function BackupPanel() {
  const lastExport = useLiveQuery(() => getLastExportAt(), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      setResult(await importBackup(text, mode));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read that file.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Backup &amp; restore</h2>
        <p className="mt-1 text-sm text-muted">
          Everything you log is stored in this browser on this device. Nothing is uploaded, so a
          downloaded backup is the only copy that survives clearing your browser data — and the
          only way to move your log to another device.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={() => {
            void downloadBackup();
          }}
        >
          Download backup
        </Button>
        <span className="text-xs text-muted">
          {lastExport ? `Last saved ${relativeDays(lastExport)}` : 'Never backed up'}
        </span>
      </div>

      <div className="border-t border-line pt-4">
        <h3 className="text-sm font-medium">Restore from a backup</h3>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm"
          >
            <option value="merge">Merge with what is here</option>
            <option value="replace">Replace everything</option>
          </select>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
            className="text-sm text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-raised file:px-3 file:py-2 file:text-sm file:text-fg"
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Merging keeps both sides and, where the same record exists twice, keeps whichever copy
          was edited most recently.
        </p>

        {result ? (
          <p className="mt-3 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok">
            Imported {result.spidersAdded} new spider(s) and {result.eventsAdded} new entries.
            Updated {result.spidersUpdated + result.eventsUpdated} existing record(s).
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-lg border border-alert/30 bg-alert/10 px-3 py-2 text-sm text-alert">
            {error}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
