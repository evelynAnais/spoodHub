import { useState } from 'react';
import type { Spider } from '../../lib/db';
import { Button, Card } from './ui';

/**
 * Writes the spider's quick-log URL to an NFC sticker.
 *
 * The tag stores a plain URL rather than app-specific data, which is what makes
 * this work on both platforms: tapping it fires the phone's built-in NFC reader
 * and opens the link. iOS never exposes an NFC *writing* API to the browser, so
 * the write button below is Android Chrome only — but a tag written once on an
 * Android phone is then readable by every phone, including iPhones.
 */
export function TagPanel({ spider }: { spider: Spider }) {
  const url = `${location.origin}/log?s=${spider.id}`;
  const canWrite = typeof window !== 'undefined' && 'NDEFReader' in window;
  const [state, setState] = useState<'idle' | 'waiting' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  async function writeTag() {
    setState('waiting');
    setMessage('Hold the tag against the back of your phone…');
    try {
      // @ts-expect-error — Web NFC is not in the standard DOM lib yet.
      const reader = new NDEFReader();
      await reader.write({ records: [{ recordType: 'url', data: url }] });
      setState('done');
      setMessage('Tag written. Stick it on the enclosure and tap to test.');
    } catch (cause) {
      setState('error');
      setMessage(cause instanceof Error ? cause.message : 'Could not write to the tag.');
    }
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-semibold">Enclosure tag</h2>
        <p className="mt-1 text-sm text-muted">
          Put this link on an NFC sticker or a QR code on {spider.name}’s enclosure. Tapping or
          scanning it opens the quick-log screen for this spider — useful when your other hand is
          holding a feeding tub.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-bg px-3 py-2 text-xs">
          {url}
        </code>
        <Button
          onClick={() => {
            void navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      {canWrite ? (
        <div>
          <Button variant="primary" onClick={writeTag} disabled={state === 'waiting'}>
            {state === 'waiting' ? 'Waiting for tag…' : 'Write to NFC tag'}
          </Button>
          {message ? (
            <p
              className={`mt-2 text-xs ${state === 'error' ? 'text-alert' : 'text-muted'}`}
            >
              {message}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted">
          Writing tags from the browser needs Chrome on Android. On any other device, copy the
          link above and write it with an NFC app, or turn it into a QR code.
        </p>
      )}

      <p className="text-xs text-muted">
        The link only works on a device that already has {spider.name} in its local database —
        it points at your own copy of the data, not at a server.
      </p>
    </Card>
  );
}
