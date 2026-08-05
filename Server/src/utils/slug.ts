// Team names are the only identifier OpenF1 gives constructors, so URLs are
// built from them. Kept in one place because the client derives the same slug
// when it builds links — the two must not drift.
export function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    // Drop combining accents so "Alfa Romeo Orlen" and "...Orlén" agree.
    // Without this they would survive to the next rule and become dashes.
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
