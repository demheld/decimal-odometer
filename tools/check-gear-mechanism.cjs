#!/usr/bin/env node
// Collision and contact check for the carry mechanism in odometer.html ("Blick ins Getriebe").
//
// Usage:  node tools/check-gear-mechanism.cjs [path/to/odometer.html]
//         node tools/check-gear-mechanism.cjs --curves   (prints gearCurves for odometer.html)
//
// The script reads the `const gearDesign = {...};` literal from odometer.html, rebuilds every part
// as a convex polygon and turns the machine in small sub-steps. Every spoke of a star is a fork
// (stem plus two tines around a slot); a wheel's pins sit in the slots, so the star follows the
// wheel in both directions. The pink finger is a thin arm with two finger pins that enter the slots
// of the star to its left like ordinary pins. Only these contacts may move parts:
//   wheel i+1 finger -> spokes of star i     (carry: star turns)
//   star i spokes    -> pins of wheel i      (carry: next wheel turns one digit)
//   wheel i pins     -> spokes of star i     (wheel i is turned directly, its star follows)
// Any other overlap is a fault: a star hitting a disc, a hub, a foreign finger or foreign pins,
// two wheels touching, or a star running into a finger that is standing still.
//
// Planes: like a real odometer the parts lie in two planes (0 = front, 1 = back). Wheel i carries
// its pins in plane i % 2 and its fingers in plane (i + 1) % 2, star s lies in plane s % 2. Parts in
// different planes never touch; discs span both planes.
//
// After every full step every wheel must rest on a digit and every star on a spoke pitch. The
// remaining correction ("Nachrasten", detent snap) is reported and limited by design.check.maxSettle.
// Angles are degrees clockwise from 12 o'clock (SVG rotate). A wheel showing digit d is rotated -d*36.

'use strict';

const fs = require('fs');
const path = require('path');

const RAD = Math.PI / 180;
const OVERLAP_TOLERANCE = 0.05;

function polar(center, radius, angle) {
  return [center[0] + radius * Math.sin(angle * RAD), center[1] - radius * Math.cos(angle * RAD)];
}

function circlePolygon(center, radius, segments = 16) {
  const points = [];
  for (let i = 0; i < segments; i++) points.push(polar(center, radius, (i * 360) / segments));
  return points;
}

// Radial bar from innerRadius to outerRadius with a rounded outer end, shifted sideways by offset.
function barPolygon(center, innerRadius, outerRadius, width, angle, offset = 0) {
  const half = width / 2;
  const capCenter = outerRadius - half;
  const local = [[-half, innerRadius], [-half, capCenter]];
  for (let i = 1; i < 6; i++) {
    const a = -90 + i * 30;
    local.push([half * Math.sin(a * RAD), capCenter + half * Math.cos(a * RAD)]);
  }
  local.push([half, capCenter], [half, innerRadius]);
  const s = Math.sin(angle * RAD);
  const c = Math.cos(angle * RAD);
  return local.map(([x, r]) => [center[0] + (x + offset) * c + r * s, center[1] + (x + offset) * s - r * c]);
}

function shape(points) {
  let cx = 0;
  let cy = 0;
  for (const p of points) { cx += p[0]; cy += p[1]; }
  cx /= points.length;
  cy /= points.length;
  let r = 0;
  for (const p of points) r = Math.max(r, Math.hypot(p[0] - cx, p[1] - cy));
  return { points, cx, cy, r };
}

// Separating-axis test for convex polygons. Positive = gap, negative = penetration depth.
function polygonGap(a, b) {
  let gap = -Infinity;
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      let nx = p[1] - q[1];
      let ny = q[0] - p[0];
      const len = Math.hypot(nx, ny);
      if (len === 0) continue;
      nx /= len;
      ny /= len;
      let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
      for (const v of a) { const d = v[0] * nx + v[1] * ny; if (d < minA) minA = d; if (d > maxA) maxA = d; }
      for (const v of b) { const d = v[0] * nx + v[1] * ny; if (d < minB) minB = d; if (d > maxB) maxB = d; }
      gap = Math.max(gap, minB - maxA, minA - maxB);
    }
  }
  return gap;
}

function shapesGap(listA, listB, limit = 30) {
  let gap = Infinity;
  for (const a of listA) {
    for (const b of listB) {
      const rough = Math.hypot(a.cx - b.cx, a.cy - b.cy) - a.r - b.r;
      if (rough > Math.min(gap, limit)) continue;
      gap = Math.min(gap, polygonGap(a.points, b.points));
    }
  }
  return gap;
}

const pinPlane = (wheel) => wheel % 2;
const fingerPlane = (wheel) => (wheel + 1) % 2;
const starPlane = (star) => star % 2;

function wheelParts(design, index, rotation) {
  const center = [design.wheels[index].x, design.wheels[index].y];
  const { disc, pins, finger } = design;
  const pinShapes = [];
  for (let k = 0; k < pins.count; k++) {
    const angle = pins.angle + (k * 360) / pins.count + rotation;
    pinShapes.push(shape(circlePolygon(polar(center, pins.radius, angle), pins.size, 12)));
  }
  return {
    disc: [shape(circlePolygon(center, disc.radius, 48))],
    pins: pinShapes,
    // The finger arm lies in the disc plane; only its pin reaches into the star plane.
    finger: finger.angles.map((a) => shape(circlePolygon(polar(center, finger.radius, a + rotation), finger.size, 12))),
  };
}

// Every spoke is a fork: a stem from the hub to the slot bottom and two tines around the slot.
function starParts(design, index, rotation) {
  const { star } = design;
  const center = [design.stars[index].x, design.stars[index].y];
  const offset = (star.slot + star.tine) / 2;
  const spokes = [];
  for (let k = 0; k < star.spokes; k++) {
    const angle = design.stars[index].angle + (k * 360) / star.spokes + rotation;
    spokes.push(shape(barPolygon(center, 0, star.root, star.slot + 2 * star.tine, angle)));
    spokes.push(shape(barPolygon(center, star.root - star.tine, star.radius, star.tine, angle, -offset)));
    spokes.push(shape(barPolygon(center, star.root - star.tine, star.radius, star.tine, angle, offset)));
  }
  return { spokes, hub: [shape(circlePolygon(center, star.hub, 16))] };
}

function createMachine(design, value = 0) {
  const digits = design.wheels.length;
  return {
    design,
    wheel: design.wheels.map((_, w) => -(Math.floor(value / 10 ** (digits - 1 - w)) % 10) * 36),
    star: design.stars.map(() => 0),
  };
}

const overlaps = (a, b) => shapesGap(a, b) < -OVERLAP_TOLERANCE;

// Turns the driver wheel by delta and lets the allowed contacts propagate. Returns faults.
function turn(machine, driver, delta, step = 0.05, maxIterations = 4000) {
  const { design } = machine;
  const direction = Math.sign(delta);
  const faults = [];
  const wheelMoving = new Set([driver]);
  const starPushedByFinger = new Set();
  machine.wheel[driver] += delta;

  const push = (read, move, label) => {
    let iterations = 0;
    while (read()) {
      move();
      if (++iterations > maxIterations) { faults.push(label); return; }
    }
  };

  let changed = true;
  let guard = 0;
  while (changed && guard++ < 50) {
    changed = false;
    for (let s = design.stars.length - 1; s >= 0; s--) {
      const left = s;
      const right = s + 1;
      const spokes = () => starParts(design, s, machine.star[s]).spokes;
      const fingerHits = () => overlaps(wheelParts(design, right, machine.wheel[right]).finger, spokes());
      const pinsHit = () => overlaps(spokes(), wheelParts(design, left, machine.wheel[left]).pins);
      if (fingerHits()) {
        if (!wheelMoving.has(right)) {
          faults.push(`Stern ${s} läuft gegen den stehenden Finger von Rad ${right}`);
        } else {
          push(fingerHits, () => { machine.star[s] -= direction * step; }, `Finger von Rad ${right} klemmt an Stern ${s}`);
          starPushedByFinger.add(s);
          changed = true;
        }
      }
      if (pinsHit()) {
        if (starPushedByFinger.has(s)) {
          push(pinsHit, () => { machine.wheel[left] += direction * step; }, `Stern ${s} klemmt an Stiften von Rad ${left}`);
          wheelMoving.add(left);
          changed = true;
        } else if (wheelMoving.has(left)) {
          push(pinsHit, () => { machine.star[s] -= direction * step; }, `Stifte von Rad ${left} klemmen an Stern ${s}`);
          changed = true;
        } else {
          faults.push(`Stern ${s} berührt stehende Stifte von Rad ${left}`);
        }
      }
    }
  }
  return faults.concat(unwantedContacts(machine));
}

// All pairs that must never overlap. Fills `report` (label -> smallest gap) when given.
function unwantedContacts(machine, report = null) {
  const { design } = machine;
  const wheels = design.wheels.map((_, i) => wheelParts(design, i, machine.wheel[i]));
  const stars = design.stars.map((_, i) => starParts(design, i, machine.star[i]));
  const faults = [];
  const check = (label, a, b) => {
    const gap = shapesGap(a, b, report ? 30 : 0);
    if (report) report[label] = Math.min(report[label] ?? Infinity, gap);
    if (gap < -OVERLAP_TOLERANCE) faults.push(label);
  };
  stars.forEach((star, s) => {
    const all = star.spokes.concat(star.hub);
    wheels.forEach((wheel, w) => {
      check(`Stern ${s} ↔ Scheibe Rad ${w}`, all, wheel.disc);
      if (pinPlane(w) === starPlane(s)) check(`Stern ${s} ↔ Stifte Rad ${w}`, w === s ? star.hub : all, wheel.pins);
      if (fingerPlane(w) === starPlane(s)) check(`Stern ${s} ↔ Finger Rad ${w}`, w === s + 1 ? star.hub : all, wheel.finger);
    });
    stars.forEach((other, o) => {
      if (o > s && starPlane(o) === starPlane(s)) check(`Stern ${s} ↔ Stern ${o}`, all, other.spokes.concat(other.hub));
    });
  });
  for (let w = 0; w + 1 < wheels.length; w++) {
    const a = wheels[w];
    const b = wheels[w + 1];
    const plane = (wheel, index, p) => (pinPlane(index) === p ? wheel.pins : []).concat(fingerPlane(index) === p ? wheel.finger : []);
    check(`Rad ${w} ↔ Rad ${w + 1} (Scheiben)`, a.disc, b.disc.concat(b.pins, b.finger));
    check(`Rad ${w + 1} ↔ Rad ${w} (Scheiben)`, b.disc, a.disc.concat(a.pins, a.finger));
    for (const p of [0, 1]) check(`Rad ${w} ↔ Rad ${w + 1} (Ebene ${p})`, plane(a, w, p), plane(b, w + 1, p));
  }
  return faults;
}

function snap(value, pitch) {
  const target = Math.round(value / pitch) * pitch;
  return { target, error: Math.abs(value - target) };
}

// Turns wheel `driver` by `steps` digits (negative = backwards) starting at counter value `start`.
// With `record`, returns per sub-step fractions of every wheel (digits) and star (pitches).
function runScenario(design, { driver, steps, start = 0, subStep = 0.25, record = false }) {
  const machine = createMachine(design, start);
  const digits = design.wheels.length;
  const pitch = 360 / design.star.spokes;
  const result = { faults: [], maxSettle: 0, maxRatio: 0, samples: [] };
  const direction = Math.sign(steps);
  const unit = 10 ** (digits - 1 - driver);
  let value = start;
  for (let n = 0; n < Math.abs(steps); n++) {
    const wheelStart = machine.wheel.slice();
    const starStart = machine.star.slice();
    const samples = [{ progress: 0, wheels: wheelStart.map(() => 0), stars: starStart.map(() => 0) }];
    for (let done = subStep; done <= 36 + 1e-9; done += subStep) {
      const previous = machine.wheel.concat(machine.star);
      const faults = turn(machine, driver, -direction * subStep);
      const now = machine.wheel.concat(machine.star);
      for (let i = 0; i < now.length; i++) {
        if (i !== driver) result.maxRatio = Math.max(result.maxRatio, Math.abs(now[i] - previous[i]) / subStep);
      }
      for (const fault of faults) {
        if (!result.faults.some((f) => f.startsWith(fault))) result.faults.push(`${fault} (bei ${value})`);
      }
      if (record) {
        samples.push({
          progress: done / 36,
          wheels: machine.wheel.map((r, i) => (wheelStart[i] - r) / direction / 36),
          stars: machine.star.map((r, i) => (r - starStart[i]) / direction / pitch),
        });
      }
    }
    for (let w = 0; w < digits; w++) {
      const { target, error } = snap(machine.wheel[w], 36);
      result.maxSettle = Math.max(result.maxSettle, error);
      machine.wheel[w] = target;
    }
    for (let s = 0; s < machine.star.length; s++) {
      const { target, error } = snap(machine.star[s], pitch);
      result.maxSettle = Math.max(result.maxSettle, error);
      machine.star[s] = target;
    }
    value = (value + direction * unit + 10 ** digits) % 10 ** digits;
    const shown = machine.wheel.reduce((sum, r, w) => sum + (((Math.round(-r / 36) % 10) + 10) % 10) * 10 ** (digits - 1 - w), 0);
    if (record) result.samples.push(samples);
    if (shown !== value) {
      result.faults.push(`Anzeige ${String(shown).padStart(digits, '0')} statt ${String(value).padStart(digits, '0')}`);
      break;
    }
  }
  return result;
}

function restClearances(design) {
  const report = {};
  for (let digit = 0; digit < 10; digit++) unwantedContacts(createMachine(design, digit * 111), report);
  return report;
}

function checkDesign(design, { quick = false } = {}) {
  const last = design.wheels.length - 1;
  const scenarios = quick
    ? [
        { name: 'Einer +1 bei 99', driver: last, steps: 1, start: 99 },
        { name: 'Einer −1 bei 100', driver: last, steps: -1, start: 100 },
        { name: 'Zehner +10 bei 9, 19 … 99', driver: last - 1, steps: 10, start: 9 },
        { name: 'Zehner −10 bei 109 … 9', driver: last - 1, steps: -10, start: 109 },
      ]
    : [
        { name: 'Einer +1 von 0 bis 120', driver: last, steps: 120, start: 0 },
        { name: 'Einer −1 von 120 bis 0', driver: last, steps: -120, start: 120 },
        { name: 'Einer +1 von 990 bis 010', driver: last, steps: 20, start: 990 },
        { name: 'Zehner +10 von 9 bis 209', driver: last - 1, steps: 20, start: 9 },
        { name: 'Zehner +10 von 0 bis 200', driver: last - 1, steps: 20, start: 0 },
        { name: 'Zehner −10 von 209 bis 9', driver: last - 1, steps: -20, start: 209 },
        { name: 'Hunderter +100 von 99 bis 99', driver: 0, steps: 10, start: 99 },
        { name: 'Hunderter −100 von 90 bis 90', driver: 0, steps: -10, start: 90 },
      ];
  const results = scenarios.map((scenario) => ({ name: scenario.name, ...runScenario(design, scenario) }));
  return {
    ok: results.every((r) => r.faults.length === 0),
    results,
    maxSettle: Math.max(...results.map((r) => r.maxSettle)),
    clearances: restClearances(design),
  };
}

// Motion curves for the animation, normalized to 0..1 per step:
//   carry: driver progress -> next wheel progress and star progress (finger pushes star, star pushes pins)
//   follow: wheel progress -> progress of the star to its right when the wheel is turned directly
function motionCurves(design, samples = 24) {
  const last = design.wheels.length - 1;
  const pick =  (list, getter) => {
    const out = [];
    for (let i = 0; i <= samples; i++) {
      const target = i / samples;
      const sample = list.reduce((best, s) => (Math.abs(s.progress - target) < Math.abs(best.progress - target) ? s : best));
      out.push(Number(getter(sample).toFixed(4)));
    }
    return out;
  };
  const carryRun = runScenario(design, { driver: last, steps: 1, start: 9, record: true }).samples[0];
  const followRun = runScenario(design, { driver: last - 1, steps: 1, start: 0, record: true }).samples[0];
  const pitchesPerDigit = design.pins.count / 10;
  return {
    carryWheel: pick(carryRun, (s) => s.wheels[last - 1]),
    carryStar: pick(carryRun, (s) => s.stars[last - 1] / pitchesPerDigit),
    followStar: pick(followRun, (s) => s.stars[last - 1] / pitchesPerDigit),
  };
}

function readDesign(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const match = html.match(/const gearDesign = (\{[\s\S]*?\n\s*\});/);
  if (!match) throw new Error(`Kein "const gearDesign = {...};" in ${htmlPath} gefunden`);
  return Function(`"use strict"; return (${match[1]});`)();
}

module.exports = { checkDesign, runScenario, motionCurves, restClearances, readDesign, createMachine, turn, wheelParts, starParts, polar };

if (require.main === module) {
  const args = process.argv.slice(2);
  const htmlPath = args.find((arg) => !arg.startsWith('--')) || path.join(__dirname, '..', 'odometer.html');
  const design = readDesign(htmlPath);
  if (args.includes('--curves')) {
    // Normalized so that every curve ends exactly at 1 (the detent removes the small remainder).
    const curves = motionCurves(design);
    for (const [name, values] of Object.entries(curves)) {
      const end = values[values.length - 1];
      console.log(`${name}: [${values.map((v) => Number((v / end).toFixed(4))).join(', ')}],`);
    }
    process.exit(0);
  }
  const report = checkDesign(design);
  for (const r of report.results) {
    console.log(`${r.faults.length ? '✗' : '✓'} ${r.name}  (Nachrasten max ${r.maxSettle.toFixed(2)}°)`);
    for (const fault of r.faults.slice(0, 8)) console.log(`    ${fault}`);
  }
  console.log('Kleinste Abstände in Ruhe (über alle Ziffern):');
  for (const [label, gap] of Object.entries(report.clearances).sort((a, b) => a[1] - b[1]).slice(0, 8)) {
    console.log(`  ${gap.toFixed(2).padStart(7)}  ${label}`);
  }
  const limit = design.check?.maxSettle ?? 1.5;
  if (report.maxSettle > limit) console.log(`✗ Nachrasten ${report.maxSettle.toFixed(2)}° > erlaubt ${limit}°`);
  const ok = report.ok && report.maxSettle <= limit;
  console.log(ok ? 'Getriebe OK' : 'Getriebe FEHLERHAFT');
  process.exit(ok ? 0 : 1);
}
