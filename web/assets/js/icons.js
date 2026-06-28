// icons.js — set de ícones SVG (line-icons, 24×24, currentColor, stroke 2).
// Substitui os emojis do dashboard original por um sistema consistente e acessível.
// Geometria autoral simples; use icon('name', {size, cls}).

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  workflow: '<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="12" r="2.4"/><path d="M6 8.4v7.2M8.4 6.6h4.8a2.4 2.4 0 0 1 2.4 2.4v.6M8.4 17.4h4.8a2.4 2.4 0 0 0 2.4-2.4v-.6"/>',
  agents: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17.5" cy="9.5" r="2.2"/><path d="M16 14.2a4.5 4.5 0 0 1 4.5 4.3"/>',
  backlog: '<path d="M9 5h11M9 12h11M9 19h11"/><path d="M3.5 5.2l1.2 1.2 2-2.4M3.5 12.2l1.2 1.2 2-2.4"/><circle cx="4.5" cy="19" r="1.4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M21 16l-4.5-4.5L6 20"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 1 6.5 18H19v3H6.5A1.5 1.5 0 0 1 5 19.5z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9l3 3-3 3M13 15h4"/>',
  activity: '<path d="M3 12h4l2.5-7 5 14 2.5-7H21"/>',
  cpu: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v2M14 3v2M10 19v2M14 19v2M3 10h2M3 14h2M19 10h2M19 14h2"/>',
  box: '<path d="M21 8.5L12 3 3 8.5v7L12 21l9-5.5z"/><path d="M3 8.5L12 14l9-5.5M12 14v7"/>',
  layers: '<path d="M12 3l8 4.5-8 4.5-8-4.5z"/><path d="M4 12l8 4.5L20 12M4 16.5L12 21l8-4.5"/>',
  sparkles: '<path d="M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-5L6 9.4l4.4-1.6z"/><path d="M18.5 15l.7 2 .7-2 2-.7-2-.7zM5 4l.6 1.6L7 6.2l-1.4.6L5 8.4 4.4 6.8 3 6.2l1.4-.6z"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4l-8 8"/><path d="M19 14v4.5A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-11A1.5 1.5 0 0 1 6.5 6H11"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14-4.5L3 9"/><path d="M4 13a8 8 0 0 0 14 4.5L21 15"/><path d="M3 5v4h4M21 19v-4h-4"/>',
  play: '<path d="M7 4.5l12 7.5-12 7.5z"/>',
  check: '<path d="M4 12.5l5 5 11-11"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  alertTriangle: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  dot: '<circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/>',
  brain: '<path d="M9.5 4.5A2.5 2.5 0 0 0 7 7v.3A2.5 2.5 0 0 0 5.5 12 2.5 2.5 0 0 0 7 16.5 2.5 2.5 0 0 0 9.5 20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-1.5z"/><path d="M14.5 4.5A2.5 2.5 0 0 1 17 7v.3A2.5 2.5 0 0 1 18.5 12 2.5 2.5 0 0 1 17 16.5 2.5 2.5 0 0 1 14.5 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-1.5z"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18c1.4 0 2-1 2-2 0-1.2-1-1.5-1-2.5 0-.8.7-1.5 1.5-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="11" cy="7.5" r="1"/><circle cx="15.5" cy="8.5" r="1"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  bot: '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4M8 13h.01M16 13h.01M9 17h6"/><circle cx="12" cy="3.5" r="1.2"/>',
  zap: '<path d="M13 3L5 13h5l-1 8 8-10h-5z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  clipboard: '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 11h6M9 15h4"/>',
  link: '<path d="M9 13a4 4 0 0 0 5.7.4l2.6-2.6a4 4 0 0 0-5.7-5.7L10.5 6.3"/><path d="M15 11a4 4 0 0 0-5.7-.4L6.7 13.2a4 4 0 0 0 5.7 5.7L13.5 17.7"/>',
  git: '<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="9" r="2.4"/><path d="M6 8.4v7.2M16 10.5c-1 3-4 3.5-6 4"/>',
  gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l3.5-5"/><circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none"/>',
  inbox: '<path d="M4 13l2.5-7h11L20 13"/><path d="M4 13v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5h-5a3 3 0 0 1-6 0z"/>',
  sofa: '<path d="M4 11V8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5V11"/><path d="M3 12a2 2 0 0 1 2 2v2h14v-2a2 2 0 0 1 2-2 2 2 0 0 0-2-2c-1 0-2 .8-2 2H7c0-1.2-1-2-2-2a2 2 0 0 0-2 2z"/><path d="M5 18v1.5M19 18v1.5"/>',
};

function icon(name, opts = {}) {
  const inner = ICONS[name] || ICONS.dot;
  const size = opts.size || 18;
  const cls = opts.cls ? ` class="${opts.cls}"` : "";
  const sw = opts.stroke || 1.85;
  return `<svg${cls} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="${sw}" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

export { icon, ICONS };
