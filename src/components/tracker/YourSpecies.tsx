import type { Spider } from '../../lib/db';
import type { SpeciesOption } from '../../lib/species';

/**
 * A row of faces for the species the keeper actually has, each linking to that
 * species' care profile.
 *
 * This is the shortcut the whole project was meant to have: you are in the
 * tracker looking at a spider that has refused three meals, and the care
 * information for that exact species is one tap away rather than a search.
 *
 * Shows nothing at all when it would have nothing to say — no spiders yet, or
 * spiders recorded without a species. An empty row of placeholders would be
 * worse than no row.
 */
export function YourSpecies({
  spiders,
  speciesOptions,
}: {
  spiders: Spider[];
  speciesOptions: SpeciesOption[];
}) {
  const bySlug = new Map(speciesOptions.map((option) => [option.slug, option]));

  // Distinct species among the keeper's own spiders, in the order first met.
  const mine: { option: SpeciesOption; count: number }[] = [];
  for (const spider of spiders) {
    if (!spider.speciesSlug) continue;
    const option = bySlug.get(spider.speciesSlug);
    if (!option) continue;

    const existing = mine.find((m) => m.option.slug === option.slug);
    if (existing) existing.count += 1;
    else mine.push({ option, count: 1 });
  }

  if (mine.length === 0) return null;

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
        Care guides for your species
      </h2>

      <ul className="mt-3 flex flex-wrap items-center gap-3">
        {mine.map(({ option, count }) => (
          <li key={option.slug}>
            <a
              href={`/species/${option.slug}`}
              className="group flex items-center gap-2"
              title={`${option.commonName} — ${count} tracked`}
            >
              {option.thumb ? (
                <img
                  src={option.thumb}
                  alt=""
                  width={44}
                  height={44}
                  loading="lazy"
                  className="size-11 rounded-full border-2 border-line object-cover transition group-hover:-translate-y-0.5 group-hover:border-accent"
                />
              ) : (
                <span className="grid size-11 place-items-center rounded-full border-2 border-line bg-raised text-xs text-muted transition group-hover:border-accent">
                  {option.commonName.slice(0, 1)}
                </span>
              )}
              <span className="text-sm group-hover:text-accent">
                {option.commonName}
                {count > 1 ? <span className="text-muted"> ×{count}</span> : null}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
