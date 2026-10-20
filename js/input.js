// Teclado (WASD/setas + atalhos) e joystick virtual para telas de toque.
export class Input {
  constructor() {
    this.keys = new Set();
    this.handlers = {};
    this.joy = { active: false, id: null, sx: 0, sy: 0, x: 0, y: 0 };
    this.enabled = true;
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (!this.keys.has(k)) this.fire(k, e);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  on(key, fn) { (this.handlers[key] ||= []).push(fn); }
  fire(key, e) { for (const fn of this.handlers[key] || []) fn(e); }

  axis() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = 0, y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (this.joy.active) { x = this.joy.x; y = this.joy.y; }
    return { x, y };
  }

  attachJoystick(zone, knobEl, baseEl) {
    const R = 50;
    const start = (t) => {
      this.joy = { active: true, id: t.identifier, sx: t.clientX, sy: t.clientY, x: 0, y: 0 };
      baseEl.style.display = 'block';
      baseEl.style.left = `${t.clientX - R}px`; baseEl.style.top = `${t.clientY - R}px`;
      knobEl.style.transform = 'translate(0px, 0px)';
    };
    zone.addEventListener('touchstart', (e) => {
      if (this.joy.active) return;
      e.preventDefault();
      start(e.changedTouches[0]);
    }, { passive: false });
    zone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.joy.id) continue;
        e.preventDefault();
        let dx = t.clientX - this.joy.sx, dy = t.clientY - this.joy.sy;
        const d = Math.hypot(dx, dy);
        if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
        this.joy.x = dx / R; this.joy.y = dy / R;
        if (Math.hypot(this.joy.x, this.joy.y) < 0.2) { this.joy.x = 0; this.joy.y = 0; }
        knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.joy.id) { this.joy = { active: false, id: null, x: 0, y: 0 }; baseEl.style.display = 'none'; }
    };
    zone.addEventListener('touchend', end);
    zone.addEventListener('touchcancel', end);
  }
}
