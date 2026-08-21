# Planned care guides

Topics still to write, with candidate sources gathered so far. Guides are written a few at a
time so husbandry claims can be checked before they land — see the note at the bottom on why.

## Status

| Guide | Status | Covers |
| --- | --- | --- |
| `enclosure-setup` | ✅ written | Housing, ventilation, substrate, water |
| `feeding` | ✅ written | Prey size, schedule, reading the abdomen |
| `molting` | ✅ written | Pre-molt signs, what not to do, intervals |
| `egg-sacs` | ✅ written | Infertile sacs, sperm storage, sac vs. molt retreat, gravid females |
| `sleep-and-rest` | ✅ written | Night-time rest, REM-like state, resting vs. death curl, lighting |
| `behavior-and-body-language` | ✅ written | Two visual systems, defensive behaviors, approaching without frightening, stressors |
| `/classification` (page, not a guide) | ✅ written | Spiders vs insects vs bugs, the taxonomic ladder, Araneomorphae vs Mygalomorphae, genus/species naming, subspecies and trade names |
| `sexing` | ✅ written | Palpal bulb and epigyne, the pre-subadult/subadult/adult sequence, early *P. regius* color clues |
| `age-and-instars` | ⬜ | Estimating age, counting instars, what is knowable for a wild-caught adult |
| `feeder-insects` | ⬜ | Keeping cultures, hydration, the reptile-research trap (see below) |
| `bioactive-enclosures` | ⬜ | Springtails, isopods, when bioactive is and is not worth it |
| `maintenance` | ⬜ | Cleaning frequency, spot-cleaning vs. teardown, mould |
| `breeding` | ⬜ | Pairing, courtship, risk to the female, planning for a clutch |
| `spiderling-care` | ⬜ | Separating, first prey, early instars |
| `end-of-life` | ⬜ | Senescence, what dying looks like vs. pre-molt, palliative care |

Temperature and humidity ranges live in per-species frontmatter and render on each species page.
A general guide would complement that, not replace it.

## Verified sources

Fetched and confirmed to be what the label says.

| Topic | Source | kind |
| --- | --- | --- |
| Sleep | [Rößler et al. 2022, PNAS 119(33)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9388130/) — cite the **PMC** copy; pnas.org returns 403 to fetching and PMC is open access. Studied *Evarcha arcuata*, not *Phidippus*. | `paper` |
| Vision / lighting | [Dim-light vision in jumping spiders, J. Exp. Biol. 2019](https://journals.biologists.com/jeb/article/222/9/jeb198069/) | `paper` |
| Threat response | [Rößler et al. 2022, Functional Ecology — static visual predator recognition](https://besjournals.onlinelibrary.wiley.com/doi/abs/10.1111/1365-2435.13953) | `paper` |
| Feeder nutrition | [Finke 2015 — complete nutrient content of four feeder insects](https://pubmed.ncbi.nlm.nih.gov/26366856/) | `paper` |
| Feeder nutrition | [NAG — gut-loading diet evaluation for crickets, mealworms, superworms](https://nagonline.net/wp-content/uploads/2019/08/Brooks2-Brooks-Harris-2017-Gut-loading-diet-evaluation-for-crickets-mealworms-superworms.pdf) | `paper` |
| Taxonomy | [WSC — Phidippus regius](https://wsc.nmbe.ch/species/31858/Phidippus_regius) · [P. audax](https://wsc.nmbe.ch/species/31810/Phidippus_audax) · [Salticus scenicus](https://araneae.nmbe.ch/taxondata/Salticus_scenicus) | `database` |
| Pedipalp maturation | [Quade et al. 2019, Sci. Rep. 9:6945](https://pmc.ncbi.nlm.nih.gov/articles/PMC6502807/) — bulb primordium, subadult "club", haemolymph inflation. ⚠️ *Parasteatoda tepidariorum*, **Theridiidae — a different family**, not a salticid. Sequence transfers; timings do not. | `paper` |
| Vision / defense | [Spano, Long & Jakob 2012, Biology Letters 8(6)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3497142/) — secondary eyes mediate looming response. Studied ***Phidippus audax***, directly relevant. | `paper` |
| Defensive behavior | [Scriba et al. 2026, Frontiers in Zoology](https://pmc.ncbi.nlm.nih.gov/articles/PMC13067634/) — named defensive behaviors, distance-dependence, male courtship-over-caution. Studied *Saitis barbipes*. | `paper` |
| Spiders ≠ insects | [Burke Museum — Spider Myths: "Spiders are insects"](https://www.burkemuseum.org/collections-and-research/biology/arachnology-and-entomology/spider-myths/myth-spiders-are-insects) | `institution` |
| What is a "bug" | [Te Papa — What is a bug? Insects, arachnids and myriapods](https://tepapa.govt.nz/discover-collections/read-watch-play/science-and-nature/spiders-and-insects/your-bug-questions/what) | `institution` |

Species totals used on `/classification` (139 families · 4,488 genera · 53,546 species; Salticidae
~695 genera · ~6,950 species) come from World Spider Catalog figures reported in search results —
the WSC statistics page itself does not render its numbers to an automated fetch. They are stated
on the page as approximate and dated to early 2026, since roughly three new species are described
per day.

## Not yet verified

Found in search but not fetched and confirmed. **Check before citing.**

- **Arachnoboards** (arachnoboards.com) — returns 403 to automated fetching, so no thread on it
  can be verified. Do not cite it. Keeper-knowledge claims are currently marked inline in the
  prose as deliberately uncited instead; if you can confirm a specific thread yourself, it can be
  added as a `community` source.
- Jackson & Pollard (1996) *Predatory Behavior of Jumping Spiders*, Annu. Rev. Entomol. 41 —
  annualreviews.org returns 403 to fetching, and the PubMed page renders only a cookie banner.
  Search results corroborate title, authors and journal, but nothing has been read directly.
  Find an open-access copy before citing it.
- Edwards, G.B. (2004) *Revision of the jumping spiders of the genus Phidippus* — the
  authoritative taxonomic monograph, but no stable free URL located yet. Only mirrors on
  ResearchGate/Academia so far.
- Foelix, R. (2011) *Biology of Spiders*, 3rd ed. — currently cited via an OUP product page that
  returned no content when fetched. Probably fine, but unconfirmed.

## Two traps to avoid

**Guessed database IDs.** World Spider Catalog species numbers are not predictable. An earlier
draft of the species profiles cited `wsc.nmbe.ch/species/44450` for *Phidippus regius*; that ID
is actually *Griswoldia zuluensis*, a different family on a different continent. Always look the
page up and open it.

**Reptile research does not transfer.** Nearly all gut-loading literature is about reptiles, and
the focus on calcium and Ca:P ratios exists because vertebrates get metabolic bone disease.
Spiders have no bones. Cite those papers for what feeder insects *contain*, never for what a
spider *needs*.
