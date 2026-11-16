// Team colours arrive from the API already carrying a leading "#", but older
// payloads and a few hard-coded fallbacks are bare hex. Prefixing blindly
// produced "##3671c6", which CSS and SVG both discard without complaint — an
// SVG stroke then falls back to none and the mark simply never paints.
//
// Normalise in one place so neither shape can reach the DOM.
export function withHash(colour: string | null | undefined, fallback = "#666666") {
  if (!colour) return fallback;

  return colour.startsWith("#") ? colour : `#${colour}`;
}
