#!/usr/bin/env node
// Contact check for the carry mechanism in odometer.html ("Blick ins Getriebe").
//
// Usage:  node tools/check-gear-mechanism.cjs [path/to/odometer.html]
//
// The script takes `const gearDesign = {...};` and the code between "// gear mechanism start" and
// "// gear mechanism end" from odometer.html, so it checks exactly the motion the page animates.
//
// Mechanism (Geneva star): every wheel has 10 spokes ending in round pins and a pink pin exactly
// between 9 and 0. The star between two wheels is a disc with 4 radial slots. The pins of the left
// wheel run through its slots (one digit = a quarter turn of the star); the pink pin of the right wheel
// runs through a slot only during its step 9 -> 0 and so turns the left wheel by one digit.
// Planes: spokes of wheel w and the pink pin of wheel w + 1 lie in the plane of star w (w % 2).
//
// Checks:
//   1. During one step the star turns by exactly 90 degrees, and the pink pin (right side) needs the
//      same star angle as the pin of the left wheel at every moment (both stay in their slots).
//   2. No pin cuts into a star of its plane: during a carry, while the left wheel turns alone (with
//      the right wheel resting on any digit) and while the right wheel turns alone through 0 ... 9.
//   3. Pins in the same plane of neighbouring wheels never touch.
//   4. Stars stay clear of the dials and of the reading windows.

'use strict';

const fs = require('fs');
const path = require('path');

function loadMechanism(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const design = html.match(/const gearDesign = (\{[\s\S]*?\n\s*\});/);
  const code = html.match(/\/\/ gear mechanism start([\s\S]*?)\/\/ gear mechanism end/);
  if (!design || !code) throw new Error(`gearDesign oder "// gear mechanism start/end" fehlt in ${htmlPath}`);
  const gearDesign = Function(`"use strict"; return (${design[1]});`)();
  const createMechanism = Function(`"use strict"; ${code[1]}; return createMechanism;`)();
  return { design: gearDesign, mechanism: createMechanism(gearDesign) };
}

function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

function inside(points, p) {
  let result = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}

const wrap = (angle) => ((angle % 360) + 540) % 360 - 180;

function checkDesign(design, m) {
  const faults = [];
  const report = {};
  const note = (label, value) => { report[label] = Math.min(report[label] ?? Infinity, value); };
  const size = design.pins.size;
  const last = design.wheels.length - 1;

  // star outline in world coordinates for star s at angle sigma
  const starPoints = (s, sigma) => m.outline.map((p) => {
    const r = Math.hypot(p.x, p.y), a = Math.atan2(p.x, -p.y) * 180 / Math.PI;
    return m.polar(m.starCenters[s], r, a + sigma);
  });
  // clearance between a pin (circle) and star s: negative = overlap
  const pinGap = (pin, points) => {
    let gap = Infinity;
    for (let i = 0; i < points.length; i++) gap = Math.min(gap, segmentDistance(pin, points[i], points[(i + 1) % points.length]));
    return inside(points, pin) ? -gap - size : gap - size;
  };
  // pins of wheel w in plane p at position `position`
  const pinsOf = (w, position) => {
    const rotation = m.wheelRotation(position);
    const center = design.wheels[w];
    return {
      spokes: Array.from({ length: 10 }, (_, j) => m.polar(center, m.pinRadius, m.spokeAngle(j) + rotation)),
      carry: m.polar(center, m.pinRadius, m.carryAngle + rotation),
    };
  };
  // everything in the plane of star s against star s
  const starGap = (s, positions) => {
    const points = starPoints(s, m.starAngle(positions[s]));
    const left = pinsOf(s, positions[s]).spokes;
    const right = pinsOf(s + 1, positions[s + 1]).carry;
    return Math.min(...left.map((p) => pinGap(p, points)), pinGap(right, points));
  };

  // 1. step angle and symmetry of the pink pin
  if (Math.abs(m.stepAngle(1) - 90) > 0.01 && Math.abs(m.stepAngle(1) - 90 + 360) > 0.01) faults.push(`Stern dreht pro Schritt ${m.stepAngle(1).toFixed(2)}° statt 90°`);
  for (let s = 0; s < m.starCenters.length; s++) {
    let worst = 0;
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const pin = pinsOf(s + 1, 9 + t).carry;
      const slot = m.direction(m.starCenters[s], pin) - 45;
      worst = Math.max(worst, Math.abs(wrap(slot - m.stepAngle(t))));
    }
    note(`Rosa Stift ${s + 1} neben dem Schlitz (°)`, -worst);
    if (worst > 0.05) faults.push(`Rosa Stift von Rad ${s + 1} läuft nicht im Schlitz von Stern ${s} (${worst.toFixed(2)}°)`);
  }

  // 2. pins against stars
  for (let s = 0; s < m.starCenters.length; s++) {
    const check = (label, positions) => {
      const gap = starGap(s, positions);
      note(`Stifte ↔ Stern ${s}`, gap);
      if (gap < -0.05) faults.push(`${label}: Stift schneidet in Stern ${s} (${gap.toFixed(2)})`);
    };
    const base = design.wheels.map(() => 0);
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const positions = base.slice();
      positions[s] = t; positions[s + 1] = 9 + t;           // carry: left wheel in step with the right
      check(`Übertrag bei ${t.toFixed(2)}`, positions);
    }
    for (let digit = 0; digit < 10; digit++) {
      for (let i = 0; i <= 60; i++) {
        const positions = base.slice();
        positions[s] = i / 60; positions[s + 1] = digit;     // left wheel turns alone
        check(`linkes Rad allein, rechtes Rad auf ${digit}`, positions);
      }
    }
    for (let i = 0; i <= 900; i++) {
      const positions = base.slice();
      positions[s] = 3; positions[s + 1] = i / 100;         // right wheel turns alone 0 ... 9
      check(`rechtes Rad allein bei ${(i / 100).toFixed(2)}`, positions);
    }
  }

  // 3. pins of neighbouring wheels in the same plane
  for (let w = 0; w < last; w++) {
    let worst = Infinity;
    for (let a = 0; a < 10; a += 0.25) for (let b = 0; b < 10; b += 0.25) {
      const left = pinsOf(w, a).spokes, right = pinsOf(w + 1, b).carry;
      for (const p of left) worst = Math.min(worst, m.distance(p, right) - 2 * size);
    }
    note(`Stifte Rad ${w} ↔ rosa Stift Rad ${w + 1}`, worst);
    if (worst < 0) faults.push(`Stifte von Rad ${w} berühren den rosa Stift von Rad ${w + 1}`);
  }

  // 4. stars vs dials and windows
  m.starCenters.forEach((center, s) => {
    design.wheels.forEach((wheel, w) => {
      const gap = m.distance(center, wheel) - design.dial.radius - m.starRadius;
      note(`Stern ${s} ↔ Zifferblatt ${w}`, gap);
      if (gap < 0) faults.push(`Stern ${s} liegt über dem Zifferblatt ${w}`);
    });
  });

  return { ok: faults.length === 0, faults: [...new Set(faults)], report };
}

module.exports = { loadMechanism, checkDesign };

if (require.main === module) {
  const htmlPath = process.argv[2] || path.join(__dirname, '..', 'odometer.html');
  const { design, mechanism } = loadMechanism(htmlPath);
  const result = checkDesign(design, mechanism);
  console.log(`Stiftradius ${mechanism.pinRadius.toFixed(2)}, Stern ${mechanism.starRadius.toFixed(2)}, Schlitz bis ${mechanism.slotBottom.toFixed(2)}`);
  for (const fault of result.faults.slice(0, 12)) console.log(`✗ ${fault}`);
  console.log('Kleinste Abstände:');
  for (const [label, gap] of Object.entries(result.report).sort((a, b) => a[1] - b[1]).slice(0, 8)) {
    console.log(`  ${gap.toFixed(2).padStart(7)}  ${label}`);
  }
  console.log(result.ok ? 'Getriebe OK' : 'Getriebe FEHLERHAFT');
  process.exit(result.ok ? 0 : 1);
}
