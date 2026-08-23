import { useState, type SyntheticEvent } from 'react';
import {
  ALL_BEHAVIORS,
  HEALTH_CONCERNS,
  logEvent,
  PREMOLT_BEHAVIORS,
  REHOUSE_REASONS,
  replaceEvent,
  type Behavior,
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

  function toggleBehavior(tag: Behavior) {
    setBehaviors((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    // Only the fields belonging to the chosen type are included, so switching
    // a feeding to a molt does not leave `prey` and `accepted` on the record.
    const payload = {
      spiderId: spider.id,
      type,
      at: new Date(at).toISOString(),
      notes: notes.trim() || undefined,
      ...(type === 'feed' ? { prey, preySize, accepted } : {}),
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
      } else {
        await logEvent(payload);
        setNotes('');
        setBehaviors([]);
      }
      onDone?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that entry.');
    } finally {
      setSaving(false);
    }
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prey">
              <input
                list="prey-options"
                value={prey}
                onChange={(e) => setPrey(e.target.value)}
                className={inputClass}
              />
              <datalist id="prey-options">
                {COMMON_PREY.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
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
