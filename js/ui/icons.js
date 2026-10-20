// Ícones em SVG (traço grosso e preenchimento chapado, no estilo do jogo).
const svg = (body, vb = '0 0 48 48') => `<svg viewBox="${vb}" aria-hidden="true" class="ico-svg">${body}</svg>`;
const S = 'stroke="#15171f" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';

export const ICONS = {
  use: svg(`<path d="M17 25V12a3.5 3.5 0 0 1 7 0v10-13a3.5 3.5 0 0 1 7 0v13-10a3.5 3.5 0 0 1 7 0v16c0 9-5 15-13 15-6 0-9-3-12-8l-5-8a3.5 3.5 0 0 1 6-3.5z" fill="#fff" ${S}/>`),
  report: svg(`<path d="M8 20h8l16-10v28L16 28H8z" fill="#ffd640" ${S}/><path d="M14 28l3 11h6l-3-11" fill="#fff" ${S}/><path d="M38 17c3 2 3 9 0 11" fill="none" ${S}/>`),
  kill: svg(`<path d="M24 4l5 12 12-4-6 11 9 7-13 1 1 13-8-9-8 9 1-13-13-1 9-7-6-11 12 4z" fill="#ff5b4f" ${S}/><circle cx="24" cy="24" r="5" fill="#fff" ${S}/>`),
  sabotage: svg(`<path d="M24 5l20 36H4z" fill="#ffd640" ${S}/><path d="M24 18v11" ${S} fill="none"/><circle cx="24" cy="35" r="2.6" fill="#15171f"/>`),
  vent: svg(`<rect x="6" y="10" width="36" height="28" rx="5" fill="#9aa5b5" ${S}/><path d="M12 18h24M12 24h24M12 30h24" ${S} fill="none"/>`),
  exit: svg(`<rect x="6" y="10" width="36" height="28" rx="5" fill="#2a303b" ${S}/><path d="M24 34V16m-8 8l8-8 8 8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  map: svg(`<path d="M5 12l12-5 14 5 12-5v29l-12 5-14-5-12 5z" fill="#7fd0a0" ${S}/><path d="M17 7v29M31 12v29" ${S} fill="none"/>`),
  pause: svg(`<rect x="10" y="9" width="10" height="30" rx="3" fill="#fff" ${S}/><rect x="28" y="9" width="10" height="30" rx="3" fill="#fff" ${S}/>`),
  admin: svg(`<rect x="5" y="9" width="38" height="26" rx="4" fill="#3d7bd9" ${S}/><path d="M17 41h14M24 35v6" ${S}/><circle cx="16" cy="20" r="3" fill="#fff"/><circle cx="26" cy="24" r="3" fill="#fff"/><circle cx="33" cy="17" r="3" fill="#fff"/>`),
  cameras: svg(`<rect x="5" y="14" width="28" height="20" rx="4" fill="#9aa5b5" ${S}/><path d="M33 20l10-5v18l-10-5z" fill="#9aa5b5" ${S}/><circle cx="14" cy="24" r="3" fill="#ff5b4f"/>`),
  fix: svg(`<path d="M30 6a10 10 0 0 0-9 13L7 33a4 4 0 0 0 6 6l14-14a10 10 0 0 0 13-9l-6 2-4-4z" fill="#ffd640" ${S}/>`),
  bell: svg(`<path d="M12 33h24l-3-5V19a9 9 0 0 0-18 0v9z" fill="#ff5b4f" ${S}/><path d="M20 38a4 4 0 0 0 8 0" ${S} fill="none"/>`),
  play: svg(`<path d="M15 9l24 15-24 15z" fill="#15171f"/>`),
  online: svg(`<circle cx="24" cy="24" r="17" fill="#7fb5ff" ${S}/><path d="M7 24h34M24 7c-6 7-6 27 0 34M24 7c6 7 6 27 0 34" ${S} fill="none"/>`),
  school: svg(`<path d="M4 18l20-10 20 10-20 10z" fill="#ffd640" ${S}/><path d="M12 22v10c4 4 20 4 24 0V22" fill="#fff" ${S}/><path d="M42 19v12" ${S}/>`),
  book: svg(`<path d="M8 9h12a4 4 0 0 1 4 4v27a4 4 0 0 0-4-4H8zM40 9H28a4 4 0 0 0-4 4v27a4 4 0 0 1 4-4h12z" fill="#fff" ${S}/>`),
  crown: svg(`<path d="M6 36l3-22 9 9 6-13 6 13 9-9 3 22z" fill="#ffd640" ${S}/>`),
  close: svg(`<path d="M12 12l24 24M36 12L12 36" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`),
  chat: svg(`<path d="M6 10h36v22H22l-10 8v-8H6z" fill="#fff" ${S}/>`),
  send: svg(`<path d="M6 24L42 8 32 42l-8-14z" fill="#ffd640" ${S}/>`),
  back: svg(`<path d="M30 10L16 24l14 14" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
};

export const icon = (name) => ICONS[name] || '';
