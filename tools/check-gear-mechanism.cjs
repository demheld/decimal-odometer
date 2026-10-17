#!/usr/bin/env node
// Contact check for the carry mechanism in odometer.html ("Blick ins Getriebe").
//
// Usage:  node tools/check-gear-mechanism.cjs [path/to/odometer.html]
//
// The script takes `const gearDesign = {...};` and the code between "// gear mechanism start" and
// "// gear mechanism end" from odometer.html, so it checks exactly the motion the page animates.
//
// Mechanism: every wheel has a blue ratchet wheel with 10 teeth and a pink cam on the 9. Between two
// wheels a straight rod slides in two guides. During the step 9 -> 0 the cam of the right wheel pushes
// the rod end, the rod tip pushes one tooth of the left wheel's ratchet wheel, a spring pushes the rod
// back, and its tip clicks over the next tooth. Planes: ratchet wheels and rod bodies in front of the
// dials, cams and the pins at the rod ends behind them.
//
// Checks:
//   1. One carry turns the left wheel by one digit (rest error "Nachrasten" <= design.check.maxSettle).
//   2. The cam lets go of the rod and the rod is back at rest before the step ends.
//   3. A cam touches a rod end only during its own step 9 -> 0 (never at rest, never a foreign rod).
//   4. The rod tip pushes the steep face of a tooth (between root and tip), never over the tooth tip.
//   5. The rod tip never cuts into a ratchet wheel (also when the left wheel turns on its own).
//   6. The rod end pin stays outside every dial; the rod body stays clear of the windows and of the
//      ratchet wheels of other wheels.

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

function checkDesign(design, m) {
  const faults = [];
  const report = {};
  const note = (label, value) => { report[label] = Math.min(report[label] ?? Infinity, value); };
  const last = design.wheels.length - 1;
  const { rod, ratchet, dial } = design;

  // 1. carry amount
  const settle = Math.abs(m.carryEnd - 1) * 36;
  if (settle > (design.check?.maxSettle ?? 1.5)) faults.push(`Übertrag dreht ${(m.carryEnd * 36).toFixed(2)}° statt 36°`);

  // 2. release and return
  if (m.released === null) faults.push('Nocken lässt die Stange im Schritt 9 → 0 nicht los');
  else if (m.released + rod.returnTime > 1) faults.push(`Stange ist am Schrittende noch nicht zurück (Nocken lässt bei ${m.released.toFixed(2)} los)`);
  if (m.pushCurve[0] !== 0) faults.push('Nocken drückt schon bei 9 auf die Stange');

  for (let gap = 0; gap < m.rods.length; gap++) {
    const g = m.rods[gap];
    // 3. the cam of every wheel against every rod end, over a full turn of that wheel
    for (let w = 0; w <= last; w++) {
      for (let k = 0; k < 3600; k++) {
        const position = k / 360;               // digits
        const touching = (() => {
          if (w !== gap + 1) {
            const wheel = design.wheels[w];
            const [a, b] = [m.polar(wheel, design.cam.inner, design.cam.angle - 36 * position), m.polar(wheel, design.cam.radius - design.cam.width / 2, design.cam.angle - 36 * position)];
            return segmentDistance(g.end, a, b) < rod.width / 2 + design.cam.width / 2;
          }
          return m.camPush(gap, -36 * position) > 0;
        })();
        const own = w === gap + 1 && position > 9 && position < 10;
        if (touching && !own) {
          faults.push(`Nocken von Rad ${w} berührt Stange ${gap} bei Stellung ${position.toFixed(2)}`);
          break;
        }
      }
    }
    // 4./5. the rod during a carry (left wheel at digit 0 carried to 1) and while the left wheel turns alone
    for (let i = 0; i <= 200; i++) {
      const x = i / 200;
      const leftPosition = m.wheelProgress(x, 1);
      const pose = m.rodPose(gap, leftPosition, 9 + x);
      const tip = m.tipAt(gap, pose.push, pose.tilt);
      const radius = m.distance(g.left, tip);
      if (pose.push > 0 && m.pushedProgress(gap, pose.push) >= leftPosition - 1e-6 && x < m.released) {
        note('Stangenspitze unter Zahnspitze beim Schieben', ratchet.tip - radius);
        if (radius > ratchet.tip - 0.5) faults.push(`Stangenspitze rutscht beim Schieben über die Zahnspitze (Radius ${radius.toFixed(1)})`);
      }
      checkClear(gap, pose, -36 * leftPosition, `Übertrag bei ${x.toFixed(2)}`);
    }
    for (let i = 0; i <= 720; i++) {
      const leftPosition = i / 72;
      const pose = m.rodPose(gap, leftPosition, 0);
      checkClear(gap, pose, -36 * leftPosition, `linkes Rad allein bei ${leftPosition.toFixed(2)}`);
    }
  }

  function checkClear(gap, pose, leftRotation, where) {
    const g = m.rods[gap];
    const tip = m.tipAt(gap, pose.push, pose.tilt);
    const end = (() => {
      const shifted = m.add(g.end, g.axis, pose.push);
      return m.polar(g.rightGuide, m.distance(g.rightGuide, shifted), m.direction(g.rightGuide, shifted) + pose.tilt);
    })();
    // tip vs ratchet outline (sampled across the rod width)
    let worst = Infinity;
    for (let o = -rod.width / 2; o <= rod.width / 2 + 1e-9; o += rod.width / 8) {
      const p = m.add(tip, g.axis, o);
      const reach = Math.sqrt(Math.max(0, (rod.width / 2) ** 2 - o * o));
      worst = Math.min(worst, m.distance(g.left, p) - reach - m.ratchetRadius(m.direction(g.left, p), leftRotation));
    }
    note('Stangenspitze ↔ Klinkenrad', worst);
    if (worst < -0.3 && !(pose.push > 0)) faults.push(`Stangenspitze schneidet ins Klinkenrad (${where})`);
    // rod end pin outside every dial
    design.wheels.forEach((wheel, w) => {
      const gapToDial = m.distance(end, wheel) - dial.radius - rod.width / 2;
      note(`Stangenende ${gap} ↔ Zifferblatt ${w}`, gapToDial);
      if (gapToDial < 0) faults.push(`Stangenende ${gap} liegt über dem Zifferblatt ${w} (${where})`);
    });
    // rod body vs windows and foreign ratchet wheels
    design.wheels.forEach((wheel, w) => {
      const { width, height, offset } = dial.window;
      const corner = { x: wheel.x - width / 2, y: wheel.y - dial.digitRadius + offset - height / 2 };
      const box = [corner, { x: corner.x + width, y: corner.y }, { x: corner.x + width, y: corner.y + height }, { x: corner.x, y: corner.y + height }];
      const toBox = Math.min(...box.map((c) => segmentDistance(c, end, tip))) - rod.width / 2;
      const inside = end.x > corner.x && end.x < corner.x + width && end.y > corner.y && end.y < corner.y + height;
      note(`Stange ${gap} ↔ Fenster ${w}`, inside ? -1 : toBox);
      if (inside || toBox < 1) faults.push(`Stange ${gap} verdeckt das Fenster von Rad ${w}`);
      if (w !== gap) {
        const toRatchet = segmentDistance(wheel, end, tip) - ratchet.tip - rod.width / 2;
        note(`Stange ${gap} ↔ Klinkenrad ${w}`, toRatchet);
        if (toRatchet < 0) faults.push(`Stange ${gap} berührt das Klinkenrad von Rad ${w} (${where})`);
      }
    });
  }

  return { ok: faults.length === 0, faults: [...new Set(faults)], report, settle };
}

module.exports = { loadMechanism, checkDesign };

if (require.main === module) {
  const htmlPath = process.argv[2] || path.join(__dirname, '..', 'odometer.html');
  const { design, mechanism } = loadMechanism(htmlPath);
  const result = checkDesign(design, mechanism);
  console.log(`Übertrag: ${(mechanism.carryEnd * 36).toFixed(2)}° (Nachrasten ${result.settle.toFixed(2)}°), Nocken lässt bei ${mechanism.released?.toFixed(2)} des Schritts los`);
  for (const fault of result.faults.slice(0, 12)) console.log(`✗ ${fault}`);
  console.log('Kleinste Abstände:');
  for (const [label, gap] of Object.entries(result.report).sort((a, b) => a[1] - b[1]).slice(0, 8)) {
    console.log(`  ${gap.toFixed(2).padStart(7)}  ${label}`);
  }
  console.log(result.ok ? 'Getriebe OK' : 'Getriebe FEHLERHAFT');
  process.exit(result.ok ? 0 : 1);
}
