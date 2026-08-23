import { useState } from 'react';
import { deleteEvent, type Spider, type TrackEvent } from '../../lib/db';
import { formatDateTime, humanizeTag } from '../../lib/format';
import { LogForm } from './LogForm';
import { Badge, EmptyState } from './ui';

function describe(event: TrackEvent): { title: string; tone: string } {
  switch (event.type) {
    case 'feed':
      return {
        title: `${event.accepted === false ? 'Refused' : 'Ate'} — ${event.prey ?? 'prey'}${
          event.preySize ? ` (${event.preySize})` : ''
        }`,
        tone: event.accepted === false ? 'watch' : 'ok',
      };
    case 'molt':
      return {
        title: `Molted${event.newInstar ? ` → instar ${event.newInstar}` : ''}`,
        tone: 'info',
      };
    case 'behavior':
      return {
        title: (event.behaviors ?? []).map(humanizeTag).join(', ') || 'Behavior',
        tone: 'muted',
      };
    case 'rehouse':
      return {
        title: `Rehoused${event.enclosure ? ` → ${event.enclosure}` : ''}${
          event.rehouseReason ? ` (${humanizeTag(event.rehouseReason).toLowerCase()})` : ''
        }`,
        tone: 'info',
      };
    case 'health':
      return {
        title: `${event.concern ? humanizeTag(event.concern) : 'Health note'}${
          event.resolved ? ' — resolved' : ''
        }`,
        tone: event.resolved ? 'muted' : 'alert',
      };
    default:
      return { title: 'Note', tone: 'muted' };
  }
}

function TimelineRow({
  event,
  spider,
  editing,
  onEdit,
  onCancel,
}: {
  event: TrackEvent;
  spider: Spider;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const { title, tone } = describe(event);

  if (editing) {
    return (
      <li className="rounded-lg border border-accent/40 bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold">Editing this entry</h3>
        <LogForm spider={spider} existing={event} onDone={onCancel} />
      </li>
    );
  }

  // `updatedAt` only differs from `createdAt` once an entry has been edited,
  // so this quietly marks corrections without needing a separate flag.
  const wasEdited = event.updatedAt !== event.createdAt;

  return (
    <li className="group flex items-start gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone}>{title}</Badge>
          <span className="text-xs text-muted">{formatDateTime(event.at)}</span>
          {wasEdited ? <span className="text-xs text-muted italic">edited</span> : null}
        </div>
        {event.notes ? <p className="mt-1.5 text-sm text-muted">{event.notes}</p> : null}
      </div>

      <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          className="rounded px-1.5 py-0.5 text-xs text-muted hover:text-accent"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm('Delete this entry? This cannot be undone.')) {
              void deleteEvent(event.id);
            }
          }}
          className="rounded px-1.5 py-0.5 text-xs text-muted hover:text-alert"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export function EventTimeline({
  events,
  spider,
}: {
  events: TrackEvent[];
  spider: Spider;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <EmptyState title="Nothing logged yet">
        The first few feedings are what make the molt estimate work.
      </EmptyState>
    );
  }

  return (
    <ol className="space-y-2">
      {events.map((event) => (
        <TimelineRow
          key={event.id}
          event={event}
          spider={spider}
          editing={editingId === event.id}
          onEdit={() => setEditingId(event.id)}
          onCancel={() => setEditingId(null)}
        />
      ))}
    </ol>
  );
}
