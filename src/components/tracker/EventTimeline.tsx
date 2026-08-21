import { deleteEvent, type TrackEvent } from '../../lib/db';
import { formatDateTime, humanizeTag } from '../../lib/format';
import { Badge, EmptyState } from './ui';

const TYPE_TONE: Record<string, string> = {
  feed: 'ok',
  molt: 'info',
  behavior: 'muted',
  rehouse: 'muted',
  health: 'alert',
  note: 'muted',
};

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

export function EventTimeline({ events }: { events: TrackEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState title="Nothing logged yet">
        The first few feedings are what make the molt estimate work.
      </EmptyState>
    );
  }

  return (
    <ol className="space-y-2">
      {events.map((event) => {
        const { title, tone } = describe(event);
        return (
          <li
            key={event.id}
            className="group flex items-start gap-3 rounded-lg border border-line bg-surface px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={tone ?? TYPE_TONE[event.type]}>{title}</Badge>
                <span className="text-xs text-muted">{formatDateTime(event.at)}</span>
              </div>
              {event.notes ? <p className="mt-1.5 text-sm text-muted">{event.notes}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('Delete this entry? This cannot be undone.')) {
                  void deleteEvent(event.id);
                }
              }}
              className="shrink-0 rounded px-1.5 py-0.5 text-xs text-muted opacity-0 transition group-hover:opacity-100 hover:text-alert focus:opacity-100"
              aria-label="Delete entry"
            >
              Delete
            </button>
          </li>
        );
      })}
    </ol>
  );
}
