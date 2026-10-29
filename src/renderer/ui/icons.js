// Inline SVG icons (stroke-based, inherit text color).
const s = (d, extra = "") => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICON = {
  back: s('<path d="M15 5l-7 7 7 7"/>'),
  fwd: s('<path d="M9 5l7 7-7 7"/>'),
  list: s('<path d="M5 7h14M5 12h14M5 17h14"/>'),
  panel: s('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'),
  play: s('<path d="M8 5l11 7-11 7z" class="fill"/>'),
  pause: s('<path d="M8 5v14M16 5v14"/>'),
  next: s('<path d="M6 5l8 7-8 7z" class="fill"/><path d="M18 5v14"/>'),
  dots: s('<circle cx="5" cy="12" r="1.6" class="fill"/><circle cx="12" cy="12" r="1.6" class="fill"/><circle cx="19" cy="12" r="1.6" class="fill"/>'),
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  user: s('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  target: s('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" class="fill"/>'),
  layers: s('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  clock: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  upload: s('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>'),
  flame: s('<path d="M12 3c1 3 4 5 4 9a4 4 0 01-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z"/>'),
  globe: s('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
  spark: s('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'),
};
