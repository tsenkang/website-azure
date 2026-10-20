// Simulação headless: valida o mapa e roda partidas completas só com bots.
// Uso: node tests/simulate.mjs [partidas]
import { Game } from '../js/core/game.js';
import { buildMap, isSolid } from '../js/core/map.js';
import { TILE as T } from '../js/config.js';

function validateMap() {
  const map = buildMap();
  const start = [Math.floor(map.spawn.px / T), Math.floor(map.spawn.py / T)];
  const seen = new Uint8Array(map.W * map.H);
  const q = [start];
  seen[start[1] * map.W + start[0]] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (isSolid(map, nx, ny) || seen[ny * map.W + nx]) continue;
      seen[ny * map.W + nx] = 1;
      q.push([nx, ny]);
    }
  }
  const points = [
    ...map.stations.map((s) => [s.id, s.stand]),
    ...map.fixPoints.map((f) => [f.id, f.stand]),
    ['emergency', map.emergency.stand], ['cameras', map.cameraConsole.stand],
    ...map.vents.map((v) => [v.id, v.stand]),
  ];
  const bad = points.filter(([, s]) => !seen[s.ty * map.W + s.tx]).map(([id]) => id);
  for (const r of map.rooms) {
    let reach = false;
    for (let y = r.y; y < r.y + r.h && !reach; y++) for (let x = r.x; x < r.x + r.w; x++) if (seen[y * map.W + x]) { reach = true; break; }
    if (!reach) bad.push(`sala:${r.id}`);
  }
  if (bad.length) throw new Error(`Pontos inalcançáveis: ${bad.join(', ')}`);
  console.log(`Mapa OK: ${map.stations.length} estações, ${map.vents.length} dutos, ${map.rooms.length} áreas, todas alcançáveis.`);
}

function runMatch(i, settings) {
  const g = new Game({ settings, allBots: true });
  const counts = { kills: 0, meetings: 0, ejections: 0, sabotages: 0, tasks: 0, vents: 0, fixes: 0 };
  g.on('kill', () => counts.kills++);
  g.on('meetingStart', () => counts.meetings++);
  g.on('eject', (r) => { if (r.ejected) counts.ejections++; });
  g.on('sabotage', () => counts.sabotages++);
  g.on('taskDone', () => counts.tasks++);
  g.on('vent', () => counts.vents++);
  g.on('sabotageEnd', (e) => { if (e.who) counts.fixes++; });
  const dt = 1 / 30;
  let steps = 0;
  const t0 = Date.now();
  while (g.phase !== 'ended' && steps < 30 * 60 * 25) { g.update(dt); steps++; }
  const ms = Date.now() - t0;
  const r = g.result;
  console.log(`#${i} [${settings.difficulty}, ${settings.players}j/${settings.impostors}imp] ` +
    (r ? `${r.winner === 'crew' ? 'ALUNOS' : 'IMPOSTORES'} venceram em ${Math.round(r.duration)}s — ${r.reason}` : 'SEM FIM (timeout)') +
    ` | ${JSON.stringify(counts)} | ${ms}ms`);
  return r;
}

validateMap();
const n = Number(process.argv[2] || 12);
const diffs = ['facil', 'normal', 'dificil'];
const wins = { crew: 0, impostor: 0, none: 0 };
for (let i = 0; i < n; i++) {
  const settings = { difficulty: diffs[i % 3], players: 6 + (i % 5), impostors: 1 + (i % 2), tasksPerPlayer: 5, discussionTime: 5, votingTime: 15 };
  const r = runMatch(i, settings);
  wins[r ? r.winner : 'none']++;
}
console.log('Resumo:', wins);
if (wins.none > 0) process.exit(1);
