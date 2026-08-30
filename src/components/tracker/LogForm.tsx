import { useEffect, useState, type SyntheticEvent } from 'react';
import {
  ALL_BEHAVIORS,
  HEALTH_CONCERNS,
  deleteEvent,
  logEvent,
  PREMOLT_BEHAVIORS,
  REHOUSE_REASONS,
  replaceEvent,
  type Behavior,
  type NewEvent,
  type EventType,
  type HealthConcern,
  type RehouseReason,
  type Spider,
  type TrackEvent,
} from '../../lib/db';
import { humanizeTag, toDateTimeInput } from '../../lib/format';
import { Button, Field, inputClass } from './ui';

const EVENT_TABS: { type: EventType; label: string }[] = [
  { type: 'feed', label: 'Feeding' },
  { type: 'molt', label: 'Molt' },
  { type: 'behavior', label: 'Behavior' },
  { type: 'rehouse', label: 'Rehouse' },
  { type: 'health', label: 'Health' },
  { type: 'note', label: 'Note' },
];

function describePayload(e: NewEvent): string {
  switch (e.type) {
    case 'feed': {
      const count = e.quantity && e.quantity > 1 ? `${e.quantity} × ` : '';
      return `${e.accepted === false ? 'Refused' : 'Ate'} ${count}${e.prey ?? 'prey'}`;
    }
    case 'molt':
      return e.newInstar ? `Molt to instar ${e.newInstar}` : 'Molt';
    case 'behavior':
      return (e.behaviors ?? []).map(humanizeTag).join(', ') || 'Behavior';
    case 'health':
      return e.concern ? humanizeTag(e.concern) : 'Health note';
    case 'rehouse':
      return 'Rehoused';
    default:
      return 'Note';
  }
}

const COMMON_PREY = [
  'Blue bottle fly',
  'House fly',
  'D. hydei fruit fly',
  'D. melanogaster fruit fly',
  'Cricket',
  'Dubia roach nymph',
  'Waxworm',
  'Mealworm',
];

export function LogForm({
  spider,
  onDone,
  defaultType = 'feed',
  existing,
}: {
  spider: Spider;
  onDone?: () => void;
  defaultType?: EventType;
  /** When present the form edits this entry instead of creating a new one. */
  existing?: TrackEvent;
}) {
  const isEditing = existing !== undefined;

  const [type, setType] = useState<EventType>(existing?.type ?? defaultType);
  const [at, setAt] = useState(() =>
    existing ? toDateTimeInput(new Date(existing.at)) : toDateTimeInput(),
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [prey, setPrey] = useState(existing?.prey ?? COMMON_PREY[0]);
  const [preySize, setPreySize] = useState<'small' | 'medium' | 'large'>(
    existing?.preySize ?? 'medium',
  );
  const [accepted, setAccepted] = useState(existing?.accepted ?? true);
  // Entries logged before quantity existed have none; treat those as 1.
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1);
  const [newInstar, setNewInstar] = useState<string>(
    existing?.newInstar !== undefined
      ? String(existing.newInstar)
      : spider.instar
        ? String(spider.instar + 1)
        : '',
  );
  const [behaviors, setBehaviors] = useState<Behavior[]>(existing?.behaviors ?? []);
  const [concern, setConcern] = useState<HealthConcern>(existing?.concern ?? 'injury');
  const [resolved, setResolved] = useState(existing?.resolved ?? false);
  const [enclosure, setEnclosure] = useState(existing?.enclosure ?? '');
  const [rehouseReason, setRehouseReason] = useState<RehouseReason>(
    existing?.rehouseReason ?? 'upgrade',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ id: string; summary: string } | null>(null);

  useEffect(() => {
    if (!confirmed) return;
    const timer = setTimeout(() => setConfirmed(null), 6000);
    return () => clearTimeout(timer);
  }, [confirmed]);

  useEffect(() => {
    if (isEditing || spider.instar === undefined) return;
    setNewInstar((current) => (current === '' ? String(spider.instar! + 1) : current));
  }, [spider.instar, isEditing]);

  function toggleBehavior(tag: Behavior) {
    setBehaviors((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      spiderId: spider.id,
      type,
      at: new Date(at).toISOString(),
      notes: notes.trim() || undefined,
      ...(type === 'feed' ? { prey, preySize, quantity, accepted } : {}),
      ...(type === 'molt' && newInstar ? { newInstar: Number(newInstar) } : {}),
      ...(type === 'behavior' ? { behaviors } : {}),
      ...(type === 'health' ? { concern, resolved } : {}),
      ...(type === 'rehouse'
        ? { enclosure: enclosure.trim() || undefined, rehouseReason }
        : {}),
    };

    try {
      if (existing) {
        await replaceEvent(existing.id, payload);
        onDone?.();
        return;
      }

      const id = await logEvent(payload);

      setNotes('');
      setBehaviors([]);
      setAt(toDateTimeInput());
      if (payload.type === 'molt' && typeof payload.newInstar === 'number') {
        setNewInstar(String(payload.newInstar + 1));
      }
      setConfirmed({ id, summary: describePayload(payload) });
      onDone?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that entry.');
    } finally {
      setSaving(false);
    }
  }

  async function undo() {
    if (!confirmed) return;
    await deleteEvent(confirmed.id);
    setConfirmed(null);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/*
        Editing is scoped to the details of an entry, never its type. Changing
        a feeding into a molt would silently rewrite what the pre-molt rules
        see, and it is a rare enough mistake that deleting and re-logging is
        the clearer fix. So the tabs become a fixed label when editing.
      */}
      {isEditing ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-raised px-3 py-1.5 text-sm font-medium">
            {EVENT_TABS.find((t) => t.type === type)?.label ?? type}
          </span>
          <span className="text-xs text-muted">
            To change the entry type, delete this one and log a new entry.
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {EVENT_TABS.map((tab) => (
            <button
              key={tab.type}
              type="button"
              onClick={() => setType(tab.type)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                type === tab.type
                  ? 'bg-accent text-accent-fg'
                  : 'bg-raised text-muted hover:text-fg'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <Field label="When">
        <input
          type="datetime-local"
          value={at}
          onChange={(e) => setAt(e.target.value)}
          className={inputClass}
          required
        />
      </Field>

      {type === 'feed' ? (
        <div className="space-y-4">
          {/*
            A plain text input with quick-pick buttons, deliberately not a
            <datalist>. Two problems with the datalist this replaces: it needs a
            document-unique id, and two LogForms can be on screen at once (the
            "log something" card plus an entry being edited), so both emitted
            the same id and the browser bound every input to the first list.
            Beyond that, datalist is native browser UI — unstyleable, and each
            browser positions and paints it differently.
          */}
          <Field label="Prey">
            <input
              value={prey}
              onChange={(e) => setPrey(e.target.value)}
              className={inputClass}
              placeholder="What did you offer?"
            />
          </Field>

          <div className="flex flex-wrap gap-1.5">
            {COMMON_PREY.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPrey(item)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  prey === item
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-line bg-raised text-muted hover:text-fg'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="How many">
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-11 shrink-0 rounded-lg border border-line bg-raised text-lg font-medium transition hover:border-accent/50"
                  aria-label="One fewer"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={99}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className={`${inputClass} text-center`}
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  className="w-11 shrink-0 rounded-lg border border-line bg-raised text-lg font-medium transition hover:border-accent/50"
                  aria-label="One more"
                >
                  +
                </button>
              </div>
            </Field>
            <Field label="Size">
              <select
                value={preySize}
                onChange={(e) => setPreySize(e.target.value as typeof preySize)}
                className={inputClass}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAccepted(true)}
              className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${
                accepted ? 'border-ok/40 bg-ok/10 text-ok' : 'border-line bg-raised text-muted'
              }`}
            >
              Ate it
            </button>
            <button
              type="button"
              onClick={() => setAccepted(false)}
              className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${
                !accepted
                  ? 'border-watch/40 bg-watch/10 text-watch'
                  : 'border-line bg-raised text-muted'
              }`}
            >
              Refused
            </button>
          </div>
          {!accepted ? (
            <p className="text-xs text-muted">
              Refusals are the main input to the pre-molt estimate — logging them matters as much
              as logging meals. Remember to remove uneaten live prey.
            </p>
          ) : null}
        </div>
      ) : null}

      {type === 'molt' ? (
        <Field
          label="New instar"
          hint="Leave blank if you are not counting instars. Recording it updates the spider."
        >
          <input
            type="number"
            min={1}
            max={12}
            value={newInstar}
            onChange={(e) => setNewInstar(e.target.value)}
            className={inputClass}
            placeholder="e.g. 6"
          />
        </Field>
      ) : null}

      {type === 'behavior' ? (
        <fieldset>
          <legend className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
            What did you see?
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {ALL_BEHAVIORS.map((tag) => {
              const selected = behaviors.includes(tag);
              const isPremoltSignal = (PREMOLT_BEHAVIORS as readonly string[]).includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleBehavior(tag)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    selected
                      ? isPremoltSignal
                        ? 'border-watch/40 bg-watch/10 text-watch'
                        : 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-line bg-raised text-muted hover:text-fg'
                  }`}
                >
                  {humanizeTag(tag)}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">
            Highlighted tags feed the pre-molt estimate.
          </p>
        </fieldset>
      ) : null}

      {type === 'health' ? (
        <div className="space-y-4">
          <Field label="Concern">
            <select
              value={concern}
              onChange={(e) => setConcern(e.target.value as HealthConcern)}
              className={inputClass}
            >
              {HEALTH_CONCERNS.map((option) => (
                <option key={option} value={option}>
                  {humanizeTag(option)}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={resolved}
              onChange={(e) => setResolved(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--c-accent)]"
            />
            <span className="text-sm">
              Already resolved
              <span className="block text-xs text-muted">
                Unresolved concerns stay flagged on {spider.name} until you log a resolved one.
              </span>
            </span>
          </label>

          {concern === 'stuck-molt' ? (
            <p className="rounded-lg border border-alert/30 bg-alert/10 px-3 py-2 text-xs text-alert">
              A spider stuck mid-molt is usually a humidity problem. Raising humidity is the only
              thing worth trying — do not attempt to pull the old skin free.
            </p>
          ) : null}
        </div>
      ) : null}

      {type === 'rehouse' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Moved into">
              <input
                value={enclosure}
                onChange={(e) => setEnclosure(e.target.value)}
                className={inputClass}
                placeholder="20×20×30 cm vertical"
              />
            </Field>
            <Field label="Reason">
              <select
                value={rehouseReason}
                onChange={(e) => setRehouseReason(e.target.value as RehouseReason)}
                className={inputClass}
              >
                {REHOUSE_REASONS.map((option) => (
                  <option key={option} value={option}>
                    {humanizeTag(option)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="text-xs text-muted">
            Worth logging even when nothing seems wrong: a move commonly costs a few feedings, and
            the pre-molt estimate uses this to avoid mistaking that for a molt.
          </p>
        </div>
      ) : null}

      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="Anything worth remembering"
        />
      </Field>

      {confirmed ? (
        <p
          role="status"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok"
        >
          <span className="font-medium">Logged</span>
          <span className="text-fg">{confirmed.summary}</span>
          <button
            type="button"
            onClick={() => void undo()}
            className="ml-auto font-medium text-accent hover:underline"
          >
            Undo
          </button>
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-alert/30 bg-alert/10 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Log it'}
        </Button>
        {onDone ? (
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
