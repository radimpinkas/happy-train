// ============================================================================
// MODULE 4: GAME.JS (Day/Night Clock, Weather, 5 Best Friends AI & Subway Ride)
// ============================================================================

// Yellow & Red Cartoon Locomotive like the reference picture!
var playerLoco = createDetailedLocomotive(0xfacc15, 0xef4444, false);
scene.add(playerLoco);
var trainHeadLight = new THREE.PointLight(0xfef08a, 0.5, 65);
scene.add(trainHeadLight);

var coachCols = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xec4899, 0x8b5cf6];
var playerCoaches = [];
function addCoach() {
  var c = createDetailedCoach(coachCols[playerCoaches.length % coachCols.length]);
  scene.add(c);
  playerCoaches.push(c);
  document.getElementById('wagon-val').textContent = playerCoaches.length;
}
addCoach(); addCoach(); addCoach();

// AI Trains ride strictly on `parallelCurve` (Second Track -> Zero Collisions!)
var aiTrains = [
  { name: "🚅 Bullet Bob Shinkansen", loco: createDetailedLocomotive(0xf8fafc, 0x2563eb, true), wagon: createDetailedCoach(0xf8fafc), edge: physicalTracksToRender[2], t: 0.35, baseSpeed: 0.30, chatCooldown: 0 },
  { name: "🚂 Rusty Steam Friend", loco: createDetailedLocomotive(0x16a34a, 0x15803d, false), wagon: createDetailedCoach(0x15803d), edge: physicalTracksToRender[5], t: 0.45, baseSpeed: 0.22, chatCooldown: 0 }
];
aiTrains.forEach(function(ai) { scene.add(ai.loco, ai.wagon); });

// Weather Particles (Rain 🌧️ & Snow ❄️)
var weatherTypes = ['clear', 'rain', 'snow'];
var currentWeatherIdx = 0;
var weatherParticles = [];
var weatherGeo = new THREE.SphereGeometry(0.35, 4, 4);
var weatherMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 });
for (var wi = 0; wi < 180; wi++) {
  var wp = new THREE.Mesh(weatherGeo, weatherMat);
  wp.position.set((Math.random() - 0.5) * 140, Math.random() * 55, (Math.random() - 0.5) * 140);
  scene.add(wp);
  weatherParticles.push(wp);
}

window.cycleWeather = function() {
  currentWeatherIdx = (currentWeatherIdx + 1) % weatherTypes.length;
  var mode = weatherTypes[currentWeatherIdx];
  var btn = document.getElementById('weather-btn');
  if (mode === 'clear') {
    btn.textContent = '☀️ Weather: Clear (W)';
    weatherMat.opacity = 0.0;
    speakCharacter('mom', '☀️ Mom Narrator', '#ec4899', 'The sun is shining brightly over the city!');
  } else if (mode === 'rain') {
    btn.textContent = '🌧️ Weather: Rain (W)';
    weatherMat.color.setHex(0xbae6fd);
    weatherMat.opacity = 0.75;
    speakCharacter('train', '🚂 Little Train Toby', '#ef4444', 'Pitter patter! Look at the raindrops falling!');
  } else {
    btn.textContent = '❄️ Weather: Snow (W)';
    weatherMat.color.setHex(0xffffff);
    weatherMat.opacity = 0.9;
    speakCharacter('train', '🚂 Little Train Toby', '#ef4444', 'Hooray! Soft white snowflakes are falling all around us!');
  }
};

// 5-Minute Day/Night Analog Clock (300 seconds = 24 hours)
var gameTimeSeconds = 125; // Starts around 10:00 AM
function updateClockAndLighting(dt) {
  gameTimeSeconds = (gameTimeSeconds + dt) % 300;
  var hoursFloat = (gameTimeSeconds / 300) * 24;
  var hr = Math.floor(hoursFloat);
  var min = Math.floor((hoursFloat - hr) * 60);

  // Draw Analog Clock Hands
  var c = document.getElementById('analog-clock');
  if (c) {
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 42, 42);
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5;
    var hAngle = ((hr % 12) + min / 60) * (Math.PI / 6) - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(21, 21); ctx.lineTo(21 + Math.cos(hAngle) * 11, 21 + Math.sin(hAngle) * 11); ctx.stroke();
    var mAngle = (min / 60) * (Math.PI * 2) - Math.PI / 2;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(21, 21); ctx.lineTo(21 + Math.cos(mAngle) * 16, 21 + Math.sin(mAngle) * 16); ctx.stroke();
  }

  var isNight = (hoursFloat >= 20 || hoursFloat < 6);
  var isSunset = (hoursFloat >= 17.5 && hoursFloat < 20) || (hoursFloat >= 6 && hoursFloat < 7.5);
  var phaseIcon = isNight ? '🌙' : (isSunset ? '🌅' : '☀️');
  var phaseName = isNight ? 'Night' : (isSunset ? 'Sunset' : 'Day');
  var padMin = min < 10 ? '0' + min : min;
  document.getElementById('time-phase-label').textContent = phaseIcon + ' ' + hr + ':' + padMin + ' ' + phaseName;

  if (pState.edge.isSubway) {
    scene.background.lerp(metroSkyColor, 0.08);
    hemiLight.intensity = 0.45;
    sunLight.intensity = 0.25;
    trainHeadLight.intensity = 3.2;
  } else if (isNight) {
    scene.background.lerp(nightSkyColor, 0.04);
    hemiLight.intensity += (0.22 - hemiLight.intensity) * 0.04;
    sunLight.intensity += (0.15 - sunLight.intensity) * 0.04;
    playerLoco.userData.beam.material.opacity = 0.85;
    trainHeadLight.intensity = 3.0;
  } else if (isSunset) {
    scene.background.lerp(sunsetSkyColor, 0.04);
    hemiLight.intensity += (0.55 - hemiLight.intensity) * 0.04;
    sunLight.intensity += (0.65 - sunLight.intensity) * 0.04;
    playerLoco.userData.beam.material.opacity = 0.55;
    trainHeadLight.intensity = 1.2;
  } else {
    scene.background.lerp(daySkyColor, 0.04);
    hemiLight.intensity += (0.85 - hemiLight.intensity) * 0.04;
    sunLight.intensity += (1.05 - sunLight.intensity) * 0.04;
    playerLoco.userData.beam.material.opacity = 0.25;
    trainHeadLight.intensity = 0.2;
  }
}

var particles = [];
var pGeo = new THREE.SphereGeometry(0.7, 8, 8);
var bCols = [0x38bdf8, 0xf472b6, 0xfacc15, 0x4ade80, 0xa78bfa];
function spawnSmokeAndBubbles(pos, count, withBubbles) {
  for (var i = 0; i < count; i++) {
    var isB = withBubbles && (i % 2 === 0);
    var col = isB ? bCols[i % bCols.length] : 0xbae6fd;
    var m = new THREE.Mesh(pGeo, new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: 0.88 }));
    m.position.set(pos.x + (Math.random() - 0.5), pos.y + 4.4, pos.z + (Math.random() - 0.5));
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
  faceCamTimer: 0,
  history: []
};

window.triggerFaceCamHighlight = function(frames) {
  pState.faceCamTimer = frames || 100;
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
    speakCharacter('mom', '👩 Mom Narrator', '#ec4899', 'Turning ' + pState.switchChoice + ' toward ' + lblL);
  } else if (key === 'ArrowRight') {
    pState.switchChoice = pState.switchChoice === 'left' ? 'straight' : 'right';
    updateHUD();
    var brR = getBranches(pState.edge);
    var nextR = (brR[pState.switchChoice] || brR.straight);
    var lblR = nextR.station ? nextR.station.name : nodes[nextR.to].name;
    speakCharacter('mom', '👩 Mom Narrator', '#ec4899', 'Turning ' + pState.switchChoice + ' toward ' + lblR);
  } else if (key === 'ArrowUp') {
    pState.speedStage = Math.min(5, pState.speedStage + 1);
    updateHUD();
    speakCharacter('train', '🚂 Little Train Toby', '#ef4444', 'Chugga chugga! Speed ' + pState.speedStage + '!');
  } else if (key === 'ArrowDown') {
    pState.speedStage = Math.max(-1, pState.speedStage - 1);
    updateHUD();
    speakCharacter('train', '🚂 Little Train Toby', '#ef4444', pState.speedStage === -1 ? 'Backing up! Beep beep!' : 'Slowing down!');
  } else if (key === 'Enter' || key === ' ') {
    playTrainHorn();
    spawnSmokeAndBubbles(playerLoco.position, 14, true);

    // Check if near one of the 4 Metro Stations -> Dive into Underground Gnome Subway!
    var metroSub = subwayEdges.find(function(se) {
      return nodes[se.from].pos.distanceTo(playerLoco.position) < 42;
    });
    if (metroSub && !pState.edge.isSubway) {
      pState.edge = metroSub;
      pState.t = 0.02;
      pState.speedStage = 3;
      playMagicSubwaySound();
      speakCharacter('train', '🚇 Little Train Toby', '#8b5cf6', 'Whoa! Diving into the Underground Metro Tunnel! Look at the glowing crystals and dancing gnomes!');
      return;
    }

    // Otherwise chat with Best Friend Charlie the Helicopter!
    playHappyLaugh();
    speakCharacter('train', '🚂 Little Train Toby', '#ef4444', 'Hi friends! Look at my big smile and colorful bubbles!');
  } else if (key === 'm' || key === 'M') {
    window.toggleMusic();
  } else if (key === 'w' || key === 'W') {
    window.cycleWeather();
  }
};

window.addEventListener('keydown', function(e) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' ', 'm', 'M', 'w', 'W'].indexOf(e.key) !== -1) {
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
  speakCharacter('train', '🚂 Little Train Toby', '#ef4444', 'Turning back to our happy city!');
};

window.unlockGateWorld = function() {
  document.getElementById('gate-modal').classList.remove('show');
  pState.atGate = false;
  nodes[pState.edge.to].unlocked = true;
  var ret = edges.find(function(e) { return e.from === pState.edge.to && e.to === pState.edge.from; });
  if (ret) { pState.edge = ret; pState.t = 0.02; }
  pState.speedStage = 3; updateHUD();
  speakCharacter('mom', '🎉 Mom Narrator', '#4ade80', 'Wonderful! Bonus Adventure World unlocked!');
};

var smoothCamPos = new THREE.Vector3(-220, 32, -200);
var smoothCamLook = new THREE.Vector3(-150, 3, -150);
var lastFriendChatTime = 0;

function animate() {
  requestAnimationFrame(animate);
  var time = Date.now() * 0.004;

  // 1. Update 5-Minute Day/Night Clock & Lighting
  updateClockAndLighting(0.016);

  // 2. Animate Grand Central Water Fountain & Underground Gnomes
  fountainDrops.forEach(function(fd) {
    fd.progress = (fd.progress + 0.022) % 1.0;
    var arcY = 3.0 + Math.sin(fd.progress * Math.PI) * 8.5;
    var rad = fd.progress * 7.5;
    fd.mesh.position.set(Math.cos(fd.angle) * rad, arcY, Math.sin(fd.angle) * rad);
  });
  subwayGnomes.forEach(function(gn) {
    gn.mesh.position.y = gn.baseY + Math.abs(Math.sin(time * 3 + gn.phase)) * 1.4;
    gn.mesh.rotation.y += 0.04;
  });

  // 3. Animate Best Friend #1: Charlie the Red Helicopter (Flies near the train & camera!)
  heliCharlie.userData.rotor.rotation.y += 0.35;
  var heliTargetX = playerLoco.position.x + Math.cos(time * 0.4) * 26;
  var heliTargetZ = playerLoco.position.z + Math.sin(time * 0.4) * 26;
  heliCharlie.position.set(heliTargetX, Math.max(18, playerLoco.position.y + 15 + Math.sin(time * 1.5) * 2.5), heliTargetZ);
  heliCharlie.lookAt(camera.position.x, heliCharlie.position.y, camera.position.z);

  // Animate Best Friend #4: Sky the Airplane flying between the 2 Airports
  planeSky.position.set(295 + Math.sin(time * 0.3) * 45, 32 + Math.cos(time * 0.6) * 12, Math.cos(time * 0.3) * 180);
  planeSky.lookAt(295 + Math.sin(time * 0.3 + 0.1) * 45, 32, Math.cos(time * 0.3 + 0.1) * 180);

  // 4. Animate Living Road Vehicles with Faces (Buster School Bus, Barnaby Blue Car, etc.)
  livingVehicles.forEach(function(lv, idx) {
    lv.angle += lv.speed;
    var rx = Math.cos(lv.angle) * (125 + idx * 14);
    var rz = Math.sin(lv.angle) * (125 + idx * 14);
    lv.mesh.position.set(rx, 0.2, rz);
    lv.mesh.lookAt(
      Math.cos(lv.angle + 0.05) * (125 + idx * 14),
      0.2,
      Math.sin(lv.angle + 0.05) * (125 + idx * 14)
    );

    // Best Friends Spontaneous Greeting when close to the Train!
    if (lv.mesh.position.distanceTo(playerLoco.position) < 32 && Date.now() - lastFriendChatTime > 11000) {
      lastFriendChatTime = Date.now();
      playCarBeepBeep();
      speakCharacter('friend', lv.name, '#facc15', 'Beep beep! Hi Little Train Toby! Look at my big happy smile!');
    }
  });

  // Check Best Friend #5: Daisy the Friendly Cow Greeting
  if (daisyTheCow.position.distanceTo(playerLoco.position) < 35 && Date.now() - lastFriendChatTime > 11000) {
    lastFriendChatTime = Date.now();
    playCowMoo();
    speakCharacter('friend', '🐄 Daisy the Friendly Cow', '#22c55e', 'Moooo! Hello Little Train Toby! Have a wonderful ride!');
  }

  // 5. Bees, Butterflies, Boats, Windmill & Soccer Match
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

  // 6. AI Trains on Parallel Second Track (Never Collide with Player!)
  aiTrains.forEach(function(ai) {
    var pCurve = ai.edge.parallelCurve || ai.edge.curve;
    ai.t += ai.baseSpeed / pCurve.getLength();
    if (ai.t >= 1.0) { ai.edge = getBranches(ai.edge).straight; ai.t = 0.0; }
    var ap = pCurve.getPointAt(ai.t);
    var atan = pCurve.getTangentAt(ai.t);
    ai.loco.position.copy(ap); ai.loco.lookAt(ap.clone().add(atan));
    var wp = pCurve.getPointAt(Math.max(0, ai.t - 0.065));
    ai.wagon.position.copy(wp); ai.wagon.lookAt(ap);

    if (ai.loco.position.distanceTo(playerLoco.position) < 28 && Date.now() - lastFriendChatTime > 11000) {
      lastFriendChatTime = Date.now();
      playTrainHorn();
      speakCharacter('friend', ai.name, '#38bdf8', 'Choo choo! Passing you safely on the second track, best friend Toby!');
    }
  });

  // 7. Collectibles
  collectibles.forEach(function(c) {
    if (c.cooldown > 0) { c.cooldown--; if (c.cooldown === 0) c.mesh.visible = true; return; }
    c.mesh.rotation.y += 0.045;
    if (playerLoco.position.distanceTo(c.mesh.position) < 5.4) {
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
          speakCharacter('train', '🚃 Little Train Toby', '#ef4444', 'Yay! We collected 3 treasures and got a new red wagon!');
        }
      }
    }
  });

  // 8. Sheep on Tracks
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
        speakCharacter('mom', '🐑 Mom Narrator', '#ec4899', 'Oh look, fluffy sheep on the track! Toby honks gently so they step onto the grass.');
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

  // 9. Station Stop & Boarding
  var stCfg = pState.edge.station;
  var curSt = (stCfg && stCfg.type === 'station') ? stationPhysicals[stCfg.name] : null;
  if (curSt && !curSt.visitedThisEdge && pState.speedStage > 0 && pState.t >= 0.48 && pState.t <= 0.54) {
    curSt.visitedThisEdge = true;
    pState.stationPause = 100;
    pState.currentVel = 0;
    pState.activeStName = stCfg.name;
    document.getElementById('place-label').textContent = stCfg.name;
    speakCharacter('mom', stCfg.emoji + ' Mom Narrator', '#ec4899', stCfg.voice);
  }

  if (pState.stationPause > 0) {
    pState.stationPause--;
    var stObj = stationPhysicals[pState.activeStName];
    if (stObj) {
      stObj.pax.forEach(function(p) {
        if (!p.boarded) {
          p.dist += 0.08;
          var np = p.baseTrackPt.clone().add(p.perp.clone().multiplyScalar(p.dist));
          p.human.group.position.set(np.x, np.y, np.z);
          if (p.dist >= -2.0) { p.boarded = true; p.human.group.visible = false; }
        }
      });
      if (pState.stationPause === 1) {
        setTimeout(function() {
          stObj.pax.forEach(function(p) {
            p.dist = -8.8; p.boarded = false;
            var rp = p.baseTrackPt.clone().add(p.perp.clone().multiplyScalar(-8.8));
            p.human.group.position.set(rp.x, rp.y, rp.z);
            p.human.group.visible = true;
          });
        }, 3000);
      }
    }
  }

  // 10. Train Movement
  var targetVel = speedMap[String(pState.speedStage)] || 0;
  if (pState.atGate || pState.stationPause > 0 || sheepBlocking) {
    targetVel = 0;
  } else if (curSt && !curSt.visitedThisEdge && pState.t > 0.36 && pState.t < 0.48 && targetVel > 0.14) {
    targetVel = 0.14;
  }

  pState.currentVel += (targetVel - pState.currentVel) * 0.065;

  if (Math.abs(pState.currentVel) > 0.002) {
    var edgeLen = pState.edge.curve.getLength();
    pState.t += pState.currentVel / edgeLen;
    wheelMeshes.forEach(function(w) { w.rotation.x += pState.currentVel * 0.35; });
    if (Math.random() < 0.25) spawnSmokeAndBubbles(playerLoco.position, 1, false);

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
  trainHeadLight.position.copy(pos).add(tan.clone().multiplyScalar(8)).add(new THREE.Vector3(0, 4, 0));

  if (pState.currentVel > 0.005) {
    pState.history.unshift({ pos: pos.clone(), dir: tan.clone() });
    if (pState.history.length > 360) pState.history.pop();
  }
  playerCoaches.forEach(function(c, idx) {
    var h = pState.history[Math.min(pState.history.length - 1, (idx + 1) * 15)];
    if (h) { c.position.copy(h.pos); c.lookAt(h.pos.clone().add(h.dir)); }
  });

  // Update Weather Particles around the train
  var wMode = weatherTypes[currentWeatherIdx];
  if (wMode !== 'clear') {
    var fallSpeed = wMode === 'rain' ? 1.4 : 0.45;
    weatherParticles.forEach(function(wp) {
      wp.position.y -= fallSpeed;
      if (wp.position.y < pos.y) {
        wp.position.y = pos.y + 48;
        wp.position.x = pos.x + (Math.random() - 0.5) * 110;
        wp.position.z = pos.z + (Math.random() - 0.5) * 110;
      }
    });
  }

  // Camera: Ducks inside Tunnel/Subway, or angles slightly forward during Face-Cam dialogue!
  var isTunnelEdge = (stCfg && stCfg.type === 'tunnel' && pState.t > 0.22 && pState.t < 0.78) || pState.edge.isSubway;
  if (pState.faceCamTimer > 0) pState.faceCamTimer--;

  var desiredCam;
  var desiredLook;
  if (isTunnelEdge) {
    desiredCam = pos.clone().sub(tan.clone().multiplyScalar(22)).add(new THREE.Vector3(0, 6.8, 0));
    desiredLook = pos.clone().add(tan.clone().multiplyScalar(18)).add(new THREE.Vector3(0, 2.5, 0));
  } else {
    desiredCam = pos.clone()
      .sub(tan.clone().multiplyScalar(36))
      .add(perpVec.clone().multiplyScalar(18))
      .add(new THREE.Vector3(0, 21, 0));
    desiredLook = pos.clone()
      .add(tan.clone().multiplyScalar(10))
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
