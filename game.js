// ============================================================================
// MODULE 4: GAME.JS (Main Game Loop, Controls, AI Behavior & Chase Camera)
// ============================================================================

var playerLoco = createDetailedLocomotive(0xef4444, 0x2563eb, false);
scene.add(playerLoco);
var trainHeadLight = new THREE.PointLight(0xfef08a, 0, 55);
scene.add(trainHeadLight);

var coachCols = [0x2563eb, 0x10b981, 0xf59e0b, 0xec4899, 0x8b5cf6, 0x06b6d4];
var playerCoaches = [];
function addCoach() {
  var c = createDetailedCoach(coachCols[playerCoaches.length % coachCols.length]);
  scene.add(c);
  playerCoaches.push(c);
  document.getElementById('wagon-val').textContent = playerCoaches.length;
}
addCoach(); addCoach(); addCoach();

var aiTrains = [
  { loco: createDetailedLocomotive(0xf8fafc, 0x2563eb, true), wagon: createDetailedCoach(0xf8fafc), edge: physicalTracksToRender[2], t: 0.35, baseSpeed: 0.32, vel: 0.32 },
  { loco: createDetailedLocomotive(0x16a34a, 0x15803d, false), wagon: createDetailedCoach(0x15803d), edge: physicalTracksToRender[5], t: 0.45, baseSpeed: 0.22, vel: 0.22 }
];
aiTrains.forEach(function(ai) { scene.add(ai.loco, ai.wagon); });

var particles = [];
var pGeo = new THREE.SphereGeometry(0.65, 8, 8);
var bCols = [0x38bdf8, 0xf472b6, 0xfacc15, 0x4ade80, 0xa78bfa];
function spawnSmokeAndBubbles(pos, count, withBubbles) {
  for (var i = 0; i < count; i++) {
    var isB = withBubbles && (i % 2 === 0);
    var col = isB ? bCols[i % bCols.length] : 0xffffff;
    var m = new THREE.Mesh(pGeo, new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: 0.85 }));
    m.position.set(pos.x + (Math.random() - 0.5), pos.y + 4.2, pos.z + (Math.random() - 0.5));
    scene.add(m);
    particles.push({ mesh: m, vy: 0.1 + Math.random() * 0.08, scale: 1.0 });
  }
}

function renderGiantArrow(choice, targetName) {
  var card = document.getElementById('giant-direction-card');
  var wrap = document.getElementById('arrow-svg-wrap');
  var title = document.getElementById('dir-title');
  var sub = document.getElementById('dir-subtitle');
  sub.textContent = 'Next: ' + targetName;
  if (choice === 'left') {
    card.style.borderColor = '#facc15'; title.style.color = '#facc15'; title.textContent = '◀ TURN LEFT';
    wrap.innerHTML = '<svg width="52" height="52" viewBox="0 0 64 64"><path d="M46 54 V32 C46 22 38 16 26 16 H14" fill="none" stroke="#facc15" stroke-width="9" stroke-linecap="round"/><polygon points="22,4 6,16 22,28" fill="#facc15"/></svg>';
  } else if (choice === 'right') {
    card.style.borderColor = '#f97316'; title.style.color = '#f97316'; title.textContent = 'TURN RIGHT ▶';
    wrap.innerHTML = '<svg width="52" height="52" viewBox="0 0 64 64"><path d="M18 54 V32 C18 22 26 16 38 16 H50" fill="none" stroke="#f97316" stroke-width="9" stroke-linecap="round"/><polygon points="42,4 58,16 42,28" fill="#f97316"/></svg>';
  } else {
    card.style.borderColor = '#4ade80'; title.style.color = '#4ade80'; title.textContent = '▲ GO STRAIGHT';
    wrap.innerHTML = '<svg width="52" height="52" viewBox="0 0 64 64"><line x1="32" y1="54" x2="32" y2="16" stroke="#4ade80" stroke-width="9" stroke-linecap="round"/><polygon points="16,24 32,4 48,24" fill="#4ade80"/></svg>';
  }
}

var pState = {
  edge: edges[0], t: 0.08,
  speedStage: 2, currentVel: 0.0,
  switchChoice: 'straight',
  score: 0, itemsCount: 0,
  stationPause: 0, activeStName: null,
  waitingRed: false, atGate: false, inTunnel: false,
  history: []
};

var speedMap = { '-1': -0.22, '0': 0, '1': 0.15, '2': 0.26, '3': 0.38, '4': 0.52, '5': 0.68 };
var speedNames = { '-1': '◀ REVERSE', '0': 'STOPPED', '1': '1/5 SLOW', '2': '2/5 CRUISE', '3': '3/5 FAST', '4': '4/5 EXPRESS', '5': '5/5 SUPER' };

for (var hi2 = 0; hi2 < 240; hi2++) {
  var initPt = pState.edge.curve.getPointAt(0.08);
  var initTan = pState.edge.curve.getTangentAt(0.08);
  pState.history.push({ pos: initPt.clone(), dir: initTan.clone() });
}

function updateHUD() {
  document.getElementById('speed-label').textContent = '⚡ ' + speedNames[String(pState.speedStage)];
  document.getElementById('sp-rev').className = 'speed-dot' + (pState.speedStage === -1 ? ' on-rev' : '');
  for (var i = 1; i <= 5; i++) {
    document.getElementById('sp-' + i).className = 'speed-dot' + (pState.speedStage >= i ? ' on-' + i : '');
  }
  var br = getBranches(pState.edge);
  var targetEdge = br[pState.switchChoice] || br.straight;
  var col = pState.switchChoice === 'left' ? 0xfacc15 : (pState.switchChoice === 'right' ? 0xf97316 : 0x4ade80);
  for (var j = 0; j < highlightDots.length; j++) {
    var ht = (j / highlightDots.length) * 0.45;
    var hp = targetEdge.curve.getPointAt(ht);
    var htan = targetEdge.curve.getTangentAt(ht);
    highlightDots[j].position.set(hp.x, hp.y + 0.28, hp.z);
    highlightDots[j].rotation.y = Math.atan2(htan.x, htan.z);
    highlightDots[j].material.color.setHex(col);
  }
  var nextLabel = targetEdge.station ? targetEdge.station.name : nodes[targetEdge.to].name;
  renderGiantArrow(pState.switchChoice, nextLabel);
}
updateHUD();

window.handleInput = function(key) {
  initAudio();
  if (pState.atGate) {
    if (key === 'ArrowDown' || key === 'ArrowLeft') reverseFromGate();
    else if (key === 'Enter') unlockGateWorld();
    return;
  }
  if (key === 'ArrowLeft') {
    pState.switchChoice = pState.switchChoice === 'right' ? 'straight' : 'left';
    updateHUD();
    var brL = getBranches(pState.edge);
    var nextL = (brL[pState.switchChoice] || brL.straight);
    var lblL = nextL.station ? nextL.station.name : nodes[nextL.to].name;
    speakPureEnglish("◀", "Switch " + pState.switchChoice + " to " + lblL, true);
  } else if (key === 'ArrowRight') {
    pState.switchChoice = pState.switchChoice === 'left' ? 'straight' : 'right';
    updateHUD();
    var brR = getBranches(pState.edge);
    var nextR = (brR[pState.switchChoice] || brR.straight);
    var lblR = nextR.station ? nextR.station.name : nodes[nextR.to].name;
    speakPureEnglish("▶", "Switch " + pState.switchChoice + " to " + lblR, true);
  } else if (key === 'ArrowUp') {
    pState.speedStage = Math.min(5, pState.speedStage + 1);
    updateHUD();
    speakPureEnglish("⚡", "Speed " + pState.speedStage, true);
  } else if (key === 'ArrowDown') {
    pState.speedStage = Math.max(-1, pState.speedStage - 1);
    updateHUD();
    speakPureEnglish(pState.speedStage === -1 ? "🔄" : "🛑", pState.speedStage === -1 ? "Backing up in reverse!" : "Slowing down!", true);
  } else if (key === 'Enter' || key === ' ') {
    playTrainHorn();
    spawnSmokeAndBubbles(playerLoco.position, 14, true);
    var beam = playerLoco.userData.beam;
    beam.material.opacity = beam.material.opacity > 0.1 ? 0.0 : 0.6;
    speakPureEnglish("🫧", "Choo choo! Horn, steam, and colorful bubbles!", true);
  } else if (key === 'm' || key === 'M') {
    window.toggleMusic();
  }
};

window.addEventListener('keydown', function(e) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' ', 'm', 'M'].indexOf(e.key) !== -1) {
    e.preventDefault();
    window.handleInput(e.key);
  }
});

window.reverseFromGate = function() {
  document.getElementById('gate-modal').classList.remove('show');
  pState.atGate = false;
  var ret = edges.find(function(e) { return e.from === pState.edge.to && e.to === pState.edge.from; });
  if (ret) { pState.edge = ret; pState.t = 0.04; }
  pState.speedStage = 2; pState.switchChoice = 'straight'; updateHUD();
  speakPureEnglish("🔄", "Turning back to the Big City!", true);
};

window.unlockGateWorld = function() {
  document.getElementById('gate-modal').classList.remove('show');
  pState.atGate = false;
  nodes[pState.edge.to].unlocked = true;
  var ret = edges.find(function(e) { return e.from === pState.edge.to && e.to === pState.edge.from; });
  if (ret) { pState.edge = ret; pState.t = 0.02; }
  pState.speedStage = 3; updateHUD();
  speakPureEnglish("🎉", "Bonus World Unlocked!", true);
};

var smoothCamPos = new THREE.Vector3(-220, 32, -200);
var smoothCamLook = new THREE.Vector3(-150, 3, -150);

function animate() {
  requestAnimationFrame(animate);
  var time = Date.now() * 0.004;

  // 1. Bees & Butterflies
  flyingInsects.forEach(function(ins) {
    var t = time * ins.speed + ins.phase;
    ins.mesh.position.set(
      ins.basePos.x + Math.sin(t) * 2.8,
      ins.basePos.y + 0.6 + Math.abs(Math.cos(t * 1.5)) * 1.4,
      ins.basePos.z + Math.cos(t) * 2.8
    );
    ins.mesh.rotation.y = -t;
    var flap = Math.sin(time * 12 + ins.phase) * 0.7;
    ins.mesh.userData.wL.rotation.z = flap;
    ins.mesh.userData.wR.rotation.z = -flap;
  });

  // 2. Windmill, Boats, Soccer & Waving Humans
  windmillBlades.rotation.z -= 0.022;
  boats.forEach(function(b) {
    b.x += b.speed * b.dir;
    if (b.x > 260) b.dir = -1;
    if (b.x < -260) b.dir = 1;
    b.mesh.position.set(b.x, 0.2, -85 + b.dir * 5);
    b.mesh.rotation.y = b.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
  });
  soccerPlayers.forEach(function(sp, i) {
    sp.angle += 0.025 * (i % 2 === 0 ? 1 : -1);
    sp.mesh.position.set(Math.cos(sp.angle) * sp.radius, 1.4, Math.sin(sp.angle) * sp.radius);
  });
  soccerBall.position.set(Math.cos(time * 1.7) * 10, 1.1, Math.sin(time * 2.3) * 10);
  wavingHumans.forEach(function(h) {
    h.armPivot.rotation.z = Math.sin(time * 2.5 + h.phase) * 0.55;
  });

  // 3. Crossings & Road Cars
  activeCrossings.forEach(function(cr) {
    cr.isClosed = playerLoco.position.distanceTo(cr.pos) < 42;
    var tr = cr.isClosed ? 0 : Math.PI / 2.2;
    cr.pivotL.rotation.z += (tr - cr.pivotL.rotation.z) * 0.12;
    cr.pivotR.rotation.z += (-tr - cr.pivotR.rotation.z) * 0.12;
  });
  roadVehicles.forEach(function(rv) {
    var stop = (rv.dir === 1 && rv.z > -16 && rv.z < -7) || (rv.dir === -1 && rv.z < 16 && rv.z > 7);
    if (!(rv.crossing.isClosed && stop)) {
      rv.z += rv.speed * rv.dir;
      if (rv.z > 48) rv.z = -48;
      if (rv.z < -48) rv.z = 48;
    }
    rv.mesh.position.set(rv.x, 0, rv.z);
  });

  // 4. Railway Signals & AI Trains
  Object.keys(railwaySignals).forEach(function(k) {
    var sig = railwaySignals[k];
    sig.timer++;
    sig.isGreen = (sig.timer % 480 < 400);
    sig.redL.material.color.setHex(sig.isGreen ? 0x450a0a : 0xef4444);
    sig.grnL.material.color.setHex(sig.isGreen ? 0x22c55e : 0x14532d);
  });

  aiTrains.forEach(function(ai) {
    var distToPlayer = ai.loco.position.distanceTo(playerLoco.position);
    var blocked = distToPlayer < 24;
    ai.vel += ((blocked ? 0 : ai.baseSpeed) - ai.vel) * 0.1;
    ai.t += ai.vel / ai.edge.curve.getLength();
    if (ai.t >= 1.0) { ai.edge = getBranches(ai.edge).straight; ai.t = 0.0; }
    var ap = ai.edge.curve.getPointAt(ai.t);
    var atan = ai.edge.curve.getTangentAt(ai.t);
    ai.loco.position.copy(ap); ai.loco.lookAt(ap.clone().add(atan));
    var wp = ai.edge.curve.getPointAt(Math.max(0, ai.t - 0.065));
    ai.wagon.position.copy(wp); ai.wagon.lookAt(ap);
  });

  // 5. Collectibles
  collectibles.forEach(function(c) {
    if (c.cooldown > 0) { c.cooldown--; if (c.cooldown === 0) c.mesh.visible = true; return; }
    c.mesh.rotation.y += 0.045;
    if (playerLoco.position.distanceTo(c.mesh.position) < 5.2) {
      c.mesh.visible = false; c.cooldown = 450;
      playCollectSound();
      spawnSmokeAndBubbles(playerLoco.position, 6, true);
      pState.score += 20; pState.itemsCount++;
      document.getElementById('score-val').textContent = pState.score;
      document.getElementById('wagon-bar-fill').style.width = ((pState.itemsCount / 3) * 100) + '%';
      if (pState.itemsCount >= 3) {
        pState.itemsCount = 0;
        document.getElementById('wagon-bar-fill').style.width = '0%';
        if (playerCoaches.length < 8) {
          addCoach();
          speakPureEnglish("🚃", "Awesome! You earned a new Passenger Wagon!");
        }
      }
    }
  });

  // 6. Sheep on Tracks
  var sheepBlocking = false;
  trackSheepFlocks.forEach(function(fl) {
    var dist = playerLoco.position.distanceTo(fl.basePos);
    if (dist < 38 && fl.offsetDist < 7.5) {
      fl.scattering = true;
      sheepBlocking = true;
      if (!fl.honked) {
        fl.honked = true;
        playTrainHorn();
        setTimeout(playSheepBaa, 250);
        speakPureEnglish("🐑", "Baa! Sheep on the tracks! Honking so the fluffy sheep walk to the meadow!", true);
      }
    }
    if (fl.scattering && fl.offsetDist < 10.5) {
      fl.offsetDist += 0.12;
      fl.group.position.copy(fl.basePos).add(fl.perp.clone().multiplyScalar(fl.offsetDist));
    } else if (dist > 140 && fl.offsetDist >= 10.0) {
      fl.offsetDist = 0; fl.scattering = false; fl.honked = false;
      fl.group.position.copy(fl.basePos);
    }
  });

  // 7. Red Signal Check
  var sigAhead = railwaySignals[pState.edge.to];
  var redStop = sigAhead && !sigAhead.isGreen && pState.t > 0.78 && pState.t < 0.88 && pState.speedStage > 0;
  if (redStop && !pState.waitingRed && pState.currentVel > 0.05) {
    pState.waitingRed = true;
    playTrainHorn();
    speakPureEnglish("🚦", "Red signal ahead! Honking and stopping safely!");
  } else if (pState.waitingRed && (!sigAhead || sigAhead.isGreen)) {
    pState.waitingRed = false;
    speakPureEnglish("🟢", "Green signal! Clear track ahead!");
  }

  // 8. Station Stop & Boarding
  var stCfg = pState.edge.station;
  var curSt = (stCfg && stCfg.type === 'station') ? stationPhysicals[stCfg.name] : null;
  if (curSt && !curSt.visitedThisEdge && pState.speedStage > 0 && pState.t >= 0.48 && pState.t <= 0.54) {
    curSt.visitedThisEdge = true;
    pState.stationPause = 105;
    pState.currentVel = 0;
    pState.activeStName = stCfg.name;
    document.getElementById('place-label').textContent = stCfg.name;
    speakPureEnglish(stCfg.emoji, stCfg.voice);
  }

  if (pState.stationPause > 0) {
    pState.stationPause--;
    var stObj = stationPhysicals[pState.activeStName];
    if (stObj) {
      stObj.pax.forEach(function(p) {
        if (!p.boarded) {
          p.dist -= 0.08;
          var np = p.baseTrackPt.clone().add(p.perp.clone().multiplyScalar(p.dist));
          p.human.group.position.set(np.x, np.y, np.z);
          if (p.dist <= 2.0) { p.boarded = true; p.human.group.visible = false; }
        }
      });
      if (pState.stationPause === 1) {
        setTimeout(function() {
          stObj.pax.forEach(function(p) {
            p.dist = 8.8; p.boarded = false;
            var rp = p.baseTrackPt.clone().add(p.perp.clone().multiplyScalar(8.8));
            p.human.group.position.set(rp.x, rp.y, rp.z);
            p.human.group.visible = true;
          });
        }, 3000);
      }
    }
  }

  // 9. Smooth Acceleration & Deceleration
  var targetVel = speedMap[String(pState.speedStage)] || 0;
  if (pState.atGate || pState.waitingRed || pState.stationPause > 0 || sheepBlocking) {
    targetVel = 0;
  } else if (curSt && !curSt.visitedThisEdge && pState.t > 0.36 && pState.t < 0.48 && targetVel > 0.14) {
    targetVel = 0.14;
  }

  pState.currentVel += (targetVel - pState.currentVel) * 0.065;

  if (Math.abs(pState.currentVel) > 0.002) {
    var edgeLen = pState.edge.curve.getLength();
    pState.t += pState.currentVel / edgeLen;
    wheelMeshes.forEach(function(w) { w.rotation.x += pState.currentVel * 0.35; });
    if (Math.random() < 0.22) spawnSmokeAndBubbles(playerLoco.position, 1, false);

    if (stCfg && stCfg.type !== 'station' && Math.abs(pState.t - 0.50) < 0.015) {
      document.getElementById('place-label').textContent = stCfg.name;
    }

    if (pState.t >= 1.0) {
      if (curSt) curSt.visitedThisEdge = false;
      var arr = nodes[pState.edge.to];
      if (arr && arr.isExit && !arr.unlocked) {
        pState.atGate = true; pState.speedStage = 0; pState.currentVel = 0;
        document.getElementById('gate-title').textContent = arr.name;
        document.getElementById('gate-modal').classList.add('show');
      }
      if (!pState.atGate) {
        var br2 = getBranches(pState.edge);
        pState.edge = br2[pState.switchChoice] || br2.straight;
        pState.t = 0.0; pState.switchChoice = 'straight';
        updateHUD();
      }
    } else if (pState.t < 0.0) {
      if (curSt) curSt.visitedThisEdge = false;
      var prevEdge = edges.find(function(e) { return e.to === pState.edge.from && e.from !== pState.edge.to && e.from.indexOf('EXIT_') !== 0; });
      if (prevEdge) { pState.edge = prevEdge; pState.t = 0.98; updateHUD(); }
      else { pState.t = 0.0; pState.speedStage = 0; pState.currentVel = 0; updateHUD(); }
    }
  }

  var ct = Math.max(0, Math.min(1, pState.t));
  var pos = pState.edge.curve.getPointAt(ct);
  var tan = pState.edge.curve.getTangentAt(ct).normalize();
  var perpVec = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

  playerLoco.position.copy(pos);
  playerLoco.lookAt(pos.clone().add(tan));

  if (pState.currentVel > 0.005) {
    pState.history.unshift({ pos: pos.clone(), dir: tan.clone() });
    if (pState.history.length > 360) pState.history.pop();
  } else if (pState.currentVel < -0.005) {
    playerCoaches.forEach(function(c, idx) {
      var backT = Math.max(0, ct - (idx + 1) * 0.055);
      var bp = pState.edge.curve.getPointAt(backT);
      var btan = pState.edge.curve.getTangentAt(backT).normalize();
      c.position.copy(bp);
      c.lookAt(bp.clone().add(btan));
    });
  }

  if (pState.currentVel >= -0.005) {
    playerCoaches.forEach(function(c, idx) {
      var h = pState.history[Math.min(pState.history.length - 1, (idx + 1) * 15)];
      if (h) { c.position.copy(h.pos); c.lookAt(h.pos.clone().add(h.dir)); }
    });
  }

  // 10. Tunnel Darkness & Camera Ducking
  var isTunnelEdge = stCfg && stCfg.type === 'tunnel';
  var insideTunnelNow = (isTunnelEdge && pState.t > 0.22 && pState.t < 0.78);
  if (insideTunnelNow && !pState.inTunnel) {
    pState.inTunnel = true;
    playerLoco.userData.beam.material.opacity = 0.88;
    trainHeadLight.intensity = 2.8;
    speakPureEnglish("🔦", "Entering the dark Mountain Tunnel! Headlights on!");
  } else if (!insideTunnelNow && pState.inTunnel) {
    pState.inTunnel = false;
    playerLoco.userData.beam.material.opacity = 0.4;
    trainHeadLight.intensity = 0;
  }
  trainHeadLight.position.copy(pos).add(tan.clone().multiplyScalar(8)).add(new THREE.Vector3(0, 4, 0));

  scene.background.lerp(insideTunnelNow ? tunnelSkyColor : daySkyColor, 0.08);
  hemiLight.intensity += ((insideTunnelNow ? 0.18 : 0.85) - hemiLight.intensity) * 0.08;
  sunLight.intensity += ((insideTunnelNow ? 0.12 : 1.05) - sunLight.intensity) * 0.08;

  var desiredCam;
  var desiredLook;
  if (insideTunnelNow) {
    desiredCam = pos.clone().sub(tan.clone().multiplyScalar(22)).add(new THREE.Vector3(0, 7.0, 0));
    desiredLook = pos.clone().add(tan.clone().multiplyScalar(18)).add(new THREE.Vector3(0, 2.5, 0));
  } else {
    desiredCam = pos.clone()
      .sub(tan.clone().multiplyScalar(38))
      .add(perpVec.clone().multiplyScalar(17))
      .add(new THREE.Vector3(0, 22, 0));
    desiredLook = pos.clone()
      .add(tan.clone().multiplyScalar(12))
      .add(new THREE.Vector3(0, 2.5, 0));
  }

  smoothCamPos.lerp(desiredCam, 0.075);
  smoothCamLook.lerp(desiredLook, 0.12);
  camera.position.copy(smoothCamPos);
  camera.lookAt(smoothCamLook);

  for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) {
    var pt = particles[pi2];
    pt.mesh.position.y += pt.vy;
    pt.scale += 0.025;
    pt.mesh.scale.set(pt.scale, pt.scale, pt.scale);
    pt.mesh.material.opacity -= 0.015;
    if (pt.mesh.material.opacity <= 0) { scene.remove(pt.mesh); particles.splice(pi2, 1); }
  }

  renderer.render(scene, camera);
}
animate();
