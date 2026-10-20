// Sistema de sabotagens fictícias (apenas mecânicas internas do jogo).
import { setRoomDoorsLocked } from './map.js';

export const SABOTAGES = {
  lights: { name: 'Apagão', alert: 'As luzes da escola apagaram! Religue o quadro de energia.', fixes: ['lights'], autoEnd: 50, fixTime: 3 },
  gps: { name: 'GPS offline', alert: 'O mapa de localização caiu! Reinicie o servidor.', fixes: ['gps'], autoEnd: 45, fixTime: 3 },
  machines: { name: 'Pane nas máquinas', alert: 'As máquinas pararam! Reinicie o CLP central da Automação.', fixes: ['machines'], autoEnd: 70, fixTime: 3 },
  critical: { name: 'Sobrecarga na subestação', alert: 'ALARME! Estabilize os DOIS consoles da subestação antes do tempo acabar!', fixes: ['critA', 'critB'], critical: true, fixTime: 2.5 },
  doors: { name: 'Portas trancadas', alert: 'Portas trancadas', duration: 10 },
};

export const SABOTAGE_COOLDOWN = 30;
export const DOOR_COOLDOWN = 18;

export class SabotageSystem {
  constructor(game) {
    this.game = game;
    this.active = null; // { type, t, remaining, fixed: {id: bool} }
    this.doorLocks = {}; // roomId -> segundos restantes
    this.cooldown = 12;
    this.doorCooldown = 8;
  }

  get critical() { return this.active && SABOTAGES[this.active.type].critical ? this.active : null; }
  isActive(type) { return this.active?.type === type; }
  get lightsOut() { return this.isActive('lights'); }
  get gpsOff() { return this.isActive('gps'); }
  get machinesDown() { return this.isActive('machines'); }

  canTrigger(type) {
    if (this.game.phase !== 'play') return false;
    if (type === 'doors') return this.doorCooldown <= 0;
    return !this.active && this.cooldown <= 0;
  }

  trigger(type, by, roomId = null) {
    if (!this.canTrigger(type)) return false;
    if (!by || !by.isImpostor) return false;
    const game = this.game;
    if (type === 'doors') {
      if (!roomId || !game.map.roomById[roomId] || game.map.roomById[roomId].corridor) return false;
      this.doorLocks[roomId] = SABOTAGES.doors.duration;
      setRoomDoorsLocked(game.map, roomId, true);
      this.doorCooldown = DOOR_COOLDOWN;
      game.emit('doors', { room: roomId, locked: true });
    } else {
      const def = SABOTAGES[type];
      this.active = {
        type, t: 0,
        remaining: def.critical ? game.diff.critTime : def.autoEnd,
        fixed: Object.fromEntries(def.fixes.map((f) => [f, false])),
      };
      this.cooldown = SABOTAGE_COOLDOWN;
      game.emit('sabotage', { type, by });
    }
    by.stats.sabotages++;
    game.addLog(`${by.name} sabotou: ${SABOTAGES[type].name}`, 'sabotage', true);
    return true;
  }

  // Marca um ponto de reparo como resolvido.
  fix(fixId, who) {
    const a = this.active;
    if (!a || !(fixId in a.fixed) || a.fixed[fixId]) return false;
    a.fixed[fixId] = true;
    this.game.emit('fixPart', { fixId, who });
    if (Object.values(a.fixed).every(Boolean)) this.resolve(who);
    return true;
  }

  needsFix(fixId) {
    return !!this.active && fixId in this.active.fixed && !this.active.fixed[fixId];
  }

  resolve(who = null) {
    if (!this.active) return;
    const type = this.active.type;
    this.active = null;
    this.game.emit('sabotageEnd', { type, who });
    if (who) this.game.addLog(`${who.name} resolveu: ${SABOTAGES[type].name}`, 'fix');
  }

  clearAll() {
    if (this.active) this.resolve(null);
    for (const room of Object.keys(this.doorLocks)) {
      setRoomDoorsLocked(this.game.map, room, false);
      this.game.emit('doors', { room, locked: false });
    }
    this.doorLocks = {};
  }

  isStationBlocked(station) {
    return this.machinesDown && !!station.machine;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.doorCooldown = Math.max(0, this.doorCooldown - dt);
    for (const room of Object.keys(this.doorLocks)) {
      this.doorLocks[room] -= dt;
      if (this.doorLocks[room] <= 0) {
        delete this.doorLocks[room];
        setRoomDoorsLocked(this.game.map, room, false);
        this.game.emit('doors', { room, locked: false });
      }
    }
    const a = this.active;
    if (!a) return;
    a.t += dt;
    a.remaining -= dt;
    if (a.remaining <= 0) {
      if (SABOTAGES[a.type].critical) this.game.end('impostor', 'A subestação didática entrou em pane antes de ser estabilizada!');
      else this.resolve(null);
    }
  }
}
