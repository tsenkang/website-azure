// Atalhos para declarar móveis nos mapas.
export const F = (type, x, y, w, h, extra = {}) => ({ type, x, y, w, h, solid: true, opaque: false, ...extra });
export const TALL = { opaque: true };
