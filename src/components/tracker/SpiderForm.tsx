import { useState, type SyntheticEvent } from 'react';
import { createSpider, updateSpider, type Sex, type Spider } from '../../lib/db';
import { toDateInput } from '../../lib/format';
import type { SpeciesOption } from '../../lib/species';
import { Button, Field, inputClass } from './ui';

export function SpiderForm({
  speciesOptions,
  existing,
  onDone,
  onCancel,
}: {
  speciesOptions: SpeciesOption[];
  existing?: Spider;
  onDone: (id: string) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [speciesSlug, setSpeciesSlug] = useState(existing?.speciesSlug ?? '');
  const [speciesName, setSpeciesName] = useState(existing?.speciesName ?? '');
  const [sex, setSex] = useState<Sex>(existing?.sex ?? 'unknown');
  const [instar, setInstar] = useState(existing?.instar ? String(existing.instar) : '');
  const [acquiredAt, setAcquiredAt] = useState(
    existing?.acquiredAt ? existing.acquiredAt.slice(0, 10) : toDateInput(),
  );
  const [source, setSource] = useState(existing?.source ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        speciesSlug: speciesSlug || undefined,
        speciesName: speciesSlug ? undefined : speciesName.trim() || undefined,
        sex,
        instar: instar ? Number(instar) : undefined,
        acquiredAt: acquiredAt ? new Date(acquiredAt).toISOString() : undefined,
        source: source.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (existing) {
        await updateSpider(existing.id, payload);
        onDone(existing.id);
      } else {
        onDone(await createSpider(payload));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Pip"
          required
          autoFocus
        />
      </Field>

      <Field label="Species" hint="Pick from the guide, or type one that isn't listed yet.">
        <select
          value={speciesSlug}
          onChange={(e) => setSpeciesSlug(e.target.value)}
          className={inputClass}
        >
          <option value="">— not listed / unknown —</option>
          {speciesOptions.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.commonName} ({option.scientificName})
            </option>
          ))}
        </select>
      </Field>

      {!speciesSlug ? (
        <Field label="Species name">
          <input
            value={speciesName}
            onChange={(e) => setSpeciesName(e.target.value)}
            className={inputClass}
            placeholder="Phidippus otiosus, or just 'unknown jumper'"
          />
        </Field>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sex">
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value as Sex)}
            className={inputClass}
          >
            <option value="unknown">Unknown</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </Field>

        <Field label="Instar" hint="Optional. Improves the first molt estimate.">
          <input
            type="number"
            min={1}
            max={12}
            value={instar}
            onChange={(e) => setInstar(e.target.value)}
            className={inputClass}
            placeholder="unknown"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Acquired">
          <input
            type="date"
            value={acquiredAt}
            onChange={(e) => setAcquiredAt(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Source">
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={inputClass}
            placeholder="Breeder, wild caught…"
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Markings, temperament, enclosure setup…"
        />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Add spider'}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
