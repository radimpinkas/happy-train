// ============================================================================
// MODULE 3: MODELS.JS (Expressive Cartoon Faces on Vehicles, 2 Airports, Fountain & Night Lights)
// ============================================================================

window.nightGlowMaterials = [];
window.wavingHumans = [];

// Creates a Cartoon Face Texture with Big Eyes & Smiling Mouth (Just like the reference image!)
window.createCartoonFacePlane = function(width, height, bgHex) {
  var c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  var ctx = c.getContext('2d');
  ctx.fillStyle = bgHex || '#facc15';
  ctx.fillRect(0, 0, 256, 256);

  // Big Cartoon Eyes
  [78, 178].forEach(function(ex) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(ex, 95, 34, 42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#0f172a'; ctx.stroke();
    // Pupil + White Glint
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(ex, 100, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(ex - 6, 90, 6, 0, Math.PI * 2); ctx.fill();
  });

  // Big Happy Cartoon Smile
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(128, 158, 52, 0.1 * Math.PI, 0.9 * Math.PI, false);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = '#0f172a'; ctx.stroke();

  var tex = new THREE.CanvasTexture(c);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
  );
};

window.spawnPerson = function(x, y, z, shirtCol, hatCol, showHello, scale) {
  var g = new THREE.Group();
  g.position.set(x, y, z);
  var sc = scale || 1.65;
  g.scale.set(sc, sc, sc);
  var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.5, 10), new THREE.MeshStandardMaterial({ color: shirtCol }));
  torso.position.y = 1.2;
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), new THREE.MeshStandardMaterial({ color: 0xfde68a }));
  head.position.y = 2.3;
  var armPivot = new THREE.Group();
  armPivot.position.set(0.5, 1.7, 0);
  var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.0, 8), new THREE.MeshStandardMaterial({ color: shirtCol }));
  arm.position.set(0.25, 0.4, 0);
  armPivot.add(arm);
  g.add(torso, head, armPivot);
  if (hatCol) {
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.25, 10), new THREE.MeshStandardMaterial({ color: hatCol }));
    cap.position.y = 2.7;
    g.add(cap);
  }
  if (showHello) {
    var hSp = makeSign("👋 HELLO!", "#ffffff", "#0f172a", 6.5, 2.0);
    hSp.position.set(0, 3.8, 0);
    g.add(hSp);
  }
  scene.add(g);
  var obj = { group: g, armPivot: armPivot, phase: Math.random() * 6 };
  wavingHumans.push(obj);
  return obj;
};

// Build Stations & Depot
window.stationPhysicals = {};
physicalTracksToRender.forEach(function(e) {
  if (!e.station) return;
  var midPt = e.curve.getPointAt(0.50);
  var tan = e.curve.getTangentAt(0.50).normalize();
  var perp = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
  var ang = Math.atan2(tan.x, tan.z);

  if (e.station.type === 'depot') {
    var depotG = new THREE.Group();
    depotG.position.copy(midPt);
    depotG.rotation.y = ang;
    var wMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });
    var wL = new THREE.Mesh(new THREE.BoxGeometry(2.0, 12, 26), wMat); wL.position.set(-9.5, 6, 0);
    var wR = wL.clone(); wR.position.set(13.5, 6, 0);
    var roof = new THREE.Mesh(new THREE.BoxGeometry(25, 2.2, 27), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    roof.position.set(2.0, 12.5, 0);
    var dSign = makeSign("🏗️ CENTRAL TRAIN DEPOT", "#0f172a", "#fde047", 25, 5.8);
    dSign.position.set(2.0, 18, 0);
    depotG.add(wL, wR, roof, dSign);
    scene.add(depotG);
    return;
  }

  if (e.station.type === 'station') {
    var platPos = midPt.clone().add(perp.clone().multiplyScalar(-9.5));
    var sg = new THREE.Group();
    sg.position.copy(platPos);
    sg.rotation.y = ang;
    var plat = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, 18), new THREE.MeshStandardMaterial({ color: 0xcbd5e1 }));
    plat.position.y = 0.6;
    var canopy = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.7, 18.5), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
    canopy.position.y = 6.2;
    var sign = makeSign(e.station.emoji + ' ' + e.station.name, '#0f172a', '#fde047', 25, 5.6);
    sign.position.set(0, 10.5, 0);
    sg.add(plat, canopy, sign);
    scene.add(sg);

    var pax = [];
    for (var pi = 0; pi < 4; pi++) {
      var startDist = -8.8;
      var along = (pi - 1.5) * 3.0;
      var baseTrackPt = midPt.clone().add(tan.clone().multiplyScalar(along));
      var pPos = baseTrackPt.clone().add(perp.clone().multiplyScalar(startDist));
      var p = spawnPerson(pPos.x, midPt.y, pPos.z, [0xf472b6, 0x22c55e, 0xfacc15, 0x38bdf8][pi], null, false, 1.45);
      pax.push({ human: p, baseTrackPt: baseTrackPt, perp: perp.clone(), dist: startDist, boarded: false });
    }
    stationPhysicals[e.station.name] = { pax: pax, visitedThisEdge: false };
  }
});

// --- GRAND CENTRAL SQUARE WITH ANIMATED WATER FOUNTAIN (Velké náměstí s vodotryskem) ---
window.fountainDrops = [];
(function buildCentralFountainSquare() {
  var fGroup = new THREE.Group();
  fGroup.position.set(26, 0, -26);
  var plaza = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 0.3, 28), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
  plaza.position.y = 0.15;
  var basin = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 1.8, 24), new THREE.MeshStandardMaterial({ color: 0x38bdf8 }));
  basin.position.y = 0.9;
  var centerPillar = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.2, 5.5, 16), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
  centerPillar.position.y = 2.8;
  var fSign = makeSign("⛲ GRAND FOUNTAIN SQUARE", "#0284c7", "#fde047", 24, 5.5);
  fSign.position.set(0, 13, 0);
  fGroup.add(plaza, basin, centerPillar, fSign);

  var dropGeo = new THREE.SphereGeometry(0.42, 6, 6);
  var dropMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd });
  for (var i = 0; i < 28; i++) {
    var d = new THREE.Mesh(dropGeo, dropMat);
    fGroup.add(d);
    fountainDrops.push({ mesh: d, angle: (i / 28) * Math.PI * 2, progress: (i / 28) });
  }
  scene.add(fGroup);
})();

// --- 2 AIRPORTS WITH TALKING AIRPLANES & RED HELICOPTERS (With Eyes & Smiling Mouths!) ---
window.aircraftList = [];
function buildAirport(x, z, name) {
  var ag = new THREE.Group();
  ag.position.set(x, 0, z);
  var runway = new THREE.Mesh(new THREE.PlaneGeometry(18, 95), new THREE.MeshStandardMaterial({ color: 0x334155 }));
  runway.rotation.x = -Math.PI / 2; runway.position.y = 0.1;
  var tower = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.2, 18, 12), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
  tower.position.set(-14, 9, 0);
  var towerTop = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3.0, 4.0, 12), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  towerTop.position.set(-14, 19, 0);
  var aSign = makeSign("✈️ " + name, "#0f172a", "#38bdf8", 25, 5.8);
  aSign.position.set(-14, 26, 0);
  ag.add(runway, tower, towerTop, aSign);
  scene.add(ag);
}
buildAirport(295, -160, "NORTH CITY AIRPORT");
buildAirport(295,  140, "SOUTH HARBOR AIRPORT");

// Build Friendly Red-and-Yellow Helicopter "Charlie" (Just like the picture!) & Airplane "Sky"
function createTalkingHelicopter(name, bodyHex) {
  var g = new THREE.Group();
  var cabin = new THREE.Mesh(new THREE.SphereGeometry(3.4, 16, 16), new THREE.MeshStandardMaterial({ color: bodyHex }));
  cabin.scale.set(1.0, 0.9, 1.45);
  var skidStripe = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 6.2), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
  skidStripe.position.y = -1.8;
  var tail = new THREE.Mesh(new THREE.ConeGeometry(1.1, 7.5, 8), new THREE.MeshStandardMaterial({ color: bodyHex }));
  tail.rotation.x = -Math.PI / 2; tail.position.set(0, 0.4, -6.5);
  var rotor = new THREE.Mesh(new THREE.BoxGeometry(13, 0.2, 1.1), new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }));
  rotor.position.y = 3.5;

  // Expressive Eyes & Smile on Front of Helicopter!
  var face = createCartoonFacePlane(3.4, 2.8, '#38bdf8');
  face.position.set(0, 0.3, 4.95);

  var tag = makeSign("🚁 " + name, "#7f1d1d", "#fde047", 16, 4);
  tag.position.set(0, 6.5, 0);
  g.add(cabin, skidStripe, tail, rotor, face, tag);
  g.userData = { rotor: rotor, name: name };
  scene.add(g);
  return g;
}

function createTalkingAirplane(name) {
  var g = new THREE.Group();
  var fuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.8, 14, 14), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  fuselage.rotation.x = Math.PI / 2;
  var wings = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 3.6), new THREE.MeshStandardMaterial({ color: 0x38bdf8 }));
  var tailWing = new THREE.Mesh(new THREE.BoxGeometry(1.0, 4.5, 2.8), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
  tailWing.position.set(0, 2.2, -5.8);
  var face = createCartoonFacePlane(2.8, 2.5, '#ffffff');
  face.position.set(0, 0.2, 7.05);
  var tag = makeSign("✈️ " + name, "#0f172a", "#38bdf8", 16, 4);
  tag.position.set(0, 5.8, 0);
  g.add(fuselage, wings, tailWing, face, tag);
  scene.add(g);
  return g;
}

window.heliCharlie = createTalkingHelicopter("Charlie the Helicopter", 0xef4444);
window.planeSky = createTalkingAirplane("Sky the Airplane");

// --- ANTHROPOMORPHIC CARS, YELLOW SCHOOL BUS & WHITE VAN (With Eyes & Smiling Mouths!) ---
window.livingVehicles = [];
function createLivingRoadVehicle(name, colHex, isBus, zOffset) {
  var g = new THREE.Group();
  var w = isBus ? 3.2 : 2.6;
  var h = isBus ? 3.2 : 2.1;
  var len = isBus ? 8.2 : 4.8;
  var body = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), new THREE.MeshStandardMaterial({ color: colHex }));
  body.position.y = h * 0.5 + 0.4;
  var face = createCartoonFacePlane(w * 0.88, h * 0.78, isBus ? '#facc15' : '#e0f2fe');
  face.position.set(0, h * 0.55 + 0.4, len * 0.5 + 0.08);
  var tag = makeSign(name, "#0f172a", "#fde047", 14, 3.5);
  tag.position.set(0, h + 2.8, 0);
  g.add(body, face, tag);
  scene.add(g);
  return { mesh: g, name: name, angle: zOffset, speed: isBus ? 0.004 : 0.0055 };
}

livingVehicles.push(createLivingRoadVehicle("🚌 Buster School Bus", 0xfacc15, true, 0.0));
livingVehicles.push(createLivingRoadVehicle("🚙 Barnaby Blue Car", 0x2563eb, false, 2.1));
livingVehicles.push(createLivingRoadVehicle("🚗 Ruby Red Car", 0xef4444, false, 4.2));
livingVehicles.push(createLivingRoadVehicle("🚐 Willy White Van", 0xf8fafc, true, 5.1));

// --- FLOWERS, BEES, BUTTERFLIES, ANIMALS & HOUSES WITH NIGHT WINDOWS ---
var flowerPositions = [];
var petalColors = [0xf472b6, 0xfacc15, 0x38bdf8, 0xf87171, 0xc084fc, 0xffffff];
var stemMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
var centerMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

for (var fi = 0; fi < 260; fi++) {
  var fx = (Math.random() - 0.5) * 520;
  var fz = (Math.random() - 0.5) * 520;
  if (isNearTrack(fx, fz, 9.0) || Math.abs(fz + 85) < 22) continue;
  var fg = new THREE.Group();
  fg.position.set(fx, 0, fz);
  var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 5), stemMat); stem.position.y = 0.55;
  var center = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6), centerMat); center.position.y = 1.15;
  var pMat = new THREE.MeshBasicMaterial({ color: petalColors[fi % petalColors.length] });
  for (var pi2 = 0; pi2 < 5; pi2++) {
    var pa = (pi2 / 5) * Math.PI * 2;
    var petal = new THREE.Mesh(new THREE.SphereGeometry(0.36, 6, 6), pMat);
    petal.scale.set(1, 0.4, 1);
    petal.position.set(Math.cos(pa) * 0.48, 1.12, Math.sin(pa) * 0.48);
    fg.add(petal);
  }
  fg.add(stem, center);
  scene.add(fg);
  if (flowerPositions.length < 60) flowerPositions.push(new THREE.Vector3(fx, 1.6, fz));
}

window.flyingInsects = [];
var beeYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
var beeBlack = new THREE.MeshBasicMaterial({ color: 0x0f172a });
var beeWingMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.75, side: THREE.DoubleSide });

flowerPositions.forEach(function(fPos, idx) {
  var isButterfly = idx % 2 === 0;
  var ig = new THREE.Group();
  ig.position.copy(fPos);
  if (isButterfly) {
    var bCol = [0xf43f5e, 0x38bdf8, 0xa855f7, 0xf97316, 0xfacc15][idx % 5];
    var wMat = new THREE.MeshBasicMaterial({ color: bCol, side: THREE.DoubleSide });
    var wL = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), wMat); wL.position.x = -0.55;
    var wR = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), wMat); wR.position.x = 0.55;
    ig.add(wL, wR);
    ig.userData = { wL: wL, wR: wR };
  } else {
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), beeYellow); body.scale.set(1, 1, 1.4);
    var stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.3, 8), beeBlack); stripe.rotation.x = Math.PI / 2;
    var wL2 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), beeWingMat); wL2.position.set(-0.4, 0.35, 0);
    var wR2 = wL2.clone(); wR2.position.set(0.4, 0.35, 0);
    ig.add(body, stripe, wL2, wR2);
    ig.userData = { wL: wL2, wR: wR2 };
  }
  scene.add(ig);
  flyingInsects.push({ mesh: ig, basePos: fPos.clone(), phase: idx * 0.9, speed: 1.5 + (idx % 3) * 0.4 });
});

function createDetailedAnimal(type) {
  var g = new THREE.Group();
  if (type === 'sheep') {
    var woolMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.95 });
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    [[0,1.4,0,1.15], [0,1.5,0.7,0.95], [0,1.5,-0.7,0.95], [-0.55,1.4,0,0.85], [0.55,1.4,0,0.85]].forEach(function(s) {
      var puff = new THREE.Mesh(new THREE.SphereGeometry(s[3], 10, 10), woolMat);
      puff.position.set(s[0], s[1], s[2]); g.add(puff);
    });
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 10), darkMat);
    head.scale.set(0.9, 0.95, 1.25); head.position.set(0, 1.85, 1.45);
    g.add(head);
  } else if (type === 'cow') {
    var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    var blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.45, 3.1), whiteMat); body.position.y = 1.55;
    var patch1 = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.85, 1.1), blackMat); patch1.position.set(0, 1.7, 0.3);
    var head = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.25), whiteMat); head.position.set(0, 2.25, 1.85);
    var face = createCartoonFacePlane(1.1, 1.0, '#f472b6'); face.position.set(0, 2.25, 2.5);
    g.add(body, patch1, head, face);
  } else {
    var yelMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 2.9), yelMat); body.position.y = 2.2;
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.58, 4.6, 8), yelMat); neck.position.set(0, 4.4, 1.35);
    g.add(body, neck);
  }
  return g;
}

window.daisyTheCow = createDetailedAnimal('cow');
daisyTheCow.position.set(175, 0, -165);
var daisySign = makeSign("🐄 Daisy the Friendly Cow", "#14532d", "#fde047", 18, 4.2);
daisySign.position.set(0, 5.5, 0);
daisyTheCow.add(daisySign);
scene.add(daisyTheCow);

window.trackSheepFlocks = [];
[
  { edgeId: 'J_SOUTH->J_SW', t: 0.25 },
  { edgeId: 'J_WEST->J_NW', t: 0.25 }
].forEach(function(cfg) {
  var e = edges.find(function(ed) { return ed.id === cfg.edgeId; });
  if (!e) return;
  var pt = e.curve.getPointAt(cfg.t);
  var tan = e.curve.getTangentAt(cfg.t).normalize();
  var perp = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
  var flockG = new THREE.Group();
  flockG.position.copy(pt);
  for (var s = 0; s < 4; s++) {
    var sh = createDetailedAnimal('sheep');
    sh.position.set((s - 1.5) * 1.8, 0, (s % 2) * 1.5);
    flockG.add(sh);
  }
  scene.add(flockG);
  trackSheepFlocks.push({ group: flockG, basePos: pt.clone(), perp: perp, offsetDist: 0, scattering: false, honked: false });
});

// Houses with Night-Glowing Windows
var sharedWindowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
nightGlowMaterials.push(sharedWindowMat);

function buildHouse(x, y, z, w, d, h, wallCol, roofCol, title) {
  if (isNearTrack(x, z, Math.max(w, d) * 0.8 + 12)) return;
  var g = new THREE.Group();
  g.position.set(x, y, z);
  var walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.75 }));
  walls.position.y = h / 2; walls.castShadow = true;
  var roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.55, 4), new THREE.MeshStandardMaterial({ color: roofCol }));
  roof.position.y = h + h * 0.27; roof.rotation.y = Math.PI / 4;
  var w1 = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.3, 0.3), sharedWindowMat);
  w1.position.set(-w * 0.26, h * 0.6, d / 2 + 0.1);
  var w2 = w1.clone(); w2.position.set(w * 0.26, h * 0.6, d / 2 + 0.1);
  g.add(walls, roof, w1, w2);
  if (title) {
    var sp = makeSign(title, '#0f172a', '#fde047', 24, 5.5);
    sp.position.set(0, h + 8.5, 0);
    g.add(sp);
  }
  scene.add(g);
}

buildHouse(-145, 0, -245, 16, 12, 9, 0xfef08a, 0xdc2626, "🏡 MOM & DAD'S HOUSE");
spawnPerson(-135, 0, -230, 0xec4899, null, true, 1.8);
spawnPerson(-131, 0, -230, 0x2563eb, null, true, 1.85);

buildHouse(195, 0, -235, 16, 12, 8.5, 0xfed7aa, 0x9a3412, "👵 GRANDMA & GRANDPA'S");
spawnPerson(185, 0, -220, 0xa855f7, null, true, 1.75);
spawnPerson(189, 0, -220, 0x15803d, null, true, 1.8);

buildHouse( 75, 0, -255, 22, 14, 11, 0xfb923c, 0xb91c1c, "🏫 SUNNY SCHOOL");
buildHouse(128, 0, -255, 18, 13, 9.5, 0xf472b6, 0x831843, "🎠 KINDERGARTEN");
buildHouse(245, 0,  225, 26, 16, 11, 0x3b82f6, 0x1e3a8a, "🛒 MEGA HYPERMARKET");

// Lush Forest Park with many Pine Trees (like the reference image!)
for (var ti2 = 0; ti2 < 140; ti2++) {
  var tx = -320 + (ti2 % 14) * 14;
  var tz = -120 + Math.floor(ti2 / 14) * 22;
  if (isNearTrack(tx, tz, 11)) continue;
  var pine = new THREE.Group();
  pine.position.set(tx, 0, tz);
  var tr = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 2.5, 6), new THREE.MeshStandardMaterial({ color: 0x78350f }));
  tr.position.y = 1.25;
  var c1 = new THREE.Mesh(new THREE.ConeGeometry(2.8, 6.0, 8), new THREE.MeshStandardMaterial({ color: 0x065f46 }));
  c1.position.y = 4.5;
  var c2 = new THREE.Mesh(new THREE.ConeGeometry(2.1, 5.0, 8), new THREE.MeshStandardMaterial({ color: 0x047857 }));
  c2.position.y = 7.2;
  pine.add(tr, c1, c2);
  scene.add(pine);
}

var wCols = [0xfef08a, 0xbae6fd, 0xfbcfe8, 0xfed7aa, 0xd9f99d];
var rCols = [0xdc2626, 0x1d4ed8, 0x047857, 0x7c2d12, 0x6d28d9];
for (var hx = -220; hx <= 220; hx += 52) {
  for (var hz = -200; hz <= 200; hz += 52) {
    if (Math.abs(hz + 85) < 28 || Math.hypot(hx, hz) < 42) continue;
    var ci = Math.abs(Math.floor(hx + hz)) % wCols.length;
    buildHouse(hx, 0, hz, 10, 9, 7.5 + (ci % 3) * 1.5, wCols[ci], rCols[ci], null);
  }
}

var river = new THREE.Mesh(new THREE.PlaneGeometry(980, 36), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25 }));
river.rotation.x = -Math.PI / 2; river.position.set(0, 0.08, -85);
scene.add(river);

window.boats = [];
for (var bi = 0; bi < 5; bi++) {
  var bg = new THREE.Group();
  var hull = new THREE.Mesh(new THREE.BoxGeometry(8, 1.8, 3.8), new THREE.MeshStandardMaterial({ color: [0xffffff, 0xef4444, 0xfacc15][bi % 3] }));
  hull.position.y = 0.9;
  var sail = new THREE.Mesh(new THREE.ConeGeometry(2.8, 7.5, 3), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  sail.position.set(0, 5.2, 0);
  bg.add(hull, sail);
  scene.add(bg);
  boats.push({ mesh: bg, x: -240 + bi * 95, dir: bi % 2 === 0 ? 1 : -1, speed: 0.22 });
}

window.windmillBlades = new THREE.Group();
var wmG = new THREE.Group(); wmG.position.set(-150, 0, 260);
var wmTower = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 6.2, 22, 12), new THREE.MeshStandardMaterial({ color: 0xfef3c7 }));
wmTower.position.y = 11;
windmillBlades.position.set(0, 19, 4.3);
for (var wi = 0; wi < 4; wi++) {
  var bl = new THREE.Mesh(new THREE.BoxGeometry(1.8, 13, 0.3), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
  bl.position.y = 6.5;
  var pv = new THREE.Group(); pv.rotation.z = (wi * Math.PI) / 2; pv.add(bl);
  windmillBlades.add(pv);
}
wmG.add(wmTower, windmillBlades);
scene.add(wmG);

window.soccerPlayers = [];
var stadG = new THREE.Group(); stadG.position.set(-245, 0, 235);
var pitch = new THREE.Mesh(new THREE.CircleGeometry(24, 28), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
pitch.rotation.x = -Math.PI / 2; pitch.position.y = 0.25;
window.soccerBall = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
soccerBall.position.y = 1.2;
stadG.add(pitch, soccerBall);
for (var spi = 0; spi < 6; spi++) {
  var spMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.5, 8), new THREE.MeshStandardMaterial({ color: spi < 3 ? 0xef4444 : 0x2563eb }));
  spMesh.position.y = 1.4;
  stadG.add(spMesh);
  soccerPlayers.push({ mesh: spMesh, angle: (spi / 6) * Math.PI * 2, radius: 7 + (spi % 2) * 6 });
}
var stSign = makeSign("⚽ FOOTBALL STADIUM", "#064e3b", "#fde047", 24, 5.5);
stSign.position.set(0, 16, 0);
stadG.add(stSign);
scene.add(stadG);

window.activeCrossings = [];
window.roadVehicles = [];
window.railwaySignals = {};
Object.keys(nodes).forEach(function(k, idx) {
  var n = nodes[k];
  if (n.isExit) return;
  var sg = new THREE.Group();
  sg.position.set(n.pos.x - 6.5, n.pos.y, n.pos.z + 6.5);
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  pole.position.y = 3.5;
  var box = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.8, 1.3), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  box.position.y = 7.2;
  var redL = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 8), new THREE.MeshBasicMaterial({ color: 0x450a0a }));
  redL.position.set(0, 7.8, 0.68);
  var grnL = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
  grnL.position.set(0, 6.6, 0.68);
  sg.add(pole, box, redL, grnL);
  scene.add(sg);
  railwaySignals[k] = { isGreen: true, redL: redL, grnL: grnL, timer: idx * 110 };
});

window.collectibles = [];
var cTypes = ['heart', 'diamond', 'duck'];
physicalTracksToRender.forEach(function(e, idx) {
  if (e.to.indexOf('EXIT_') === 0) return;
  [0.25, 0.75].forEach(function(tPos, j) {
    var type = cTypes[(idx + j) % 3];
    var g = new THREE.Group();
    var col = type === 'heart' ? 0xf43f5e : (type === 'diamond' ? 0x38bdf8 : 0xfacc15);
    var m = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, type === 'duck' ? 1 : 0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.2 }));
    g.add(m);
    var pt = e.curve.getPointAt(tPos);
    g.position.set(pt.x, pt.y + 2.2, pt.z);
    scene.add(g);
    collectibles.push({ mesh: g, type: type, basePos: pt.clone(), cooldown: 0 });
  });
});

// --- YELLOW & RED CARTOON LOCOMOTIVE WITH SMILING FACE ON FRONT (Just like the picture!) ---
window.wheelMeshes = [];
window.createDetailedLocomotive = function(primaryHex, cabinHex, isBullet) {
  var g = new THREE.Group();
  g.scale.set(0.76, 0.76, 0.76);
  var chassis = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 8.8), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
  chassis.position.set(0, 1.1, 0);
  g.add(chassis);

  var cabin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.2, 3.6), new THREE.MeshStandardMaterial({ color: cabinHex, roughness: 0.35 }));
  cabin.position.set(0, 3.5, -2.4); cabin.castShadow = true;
  var cabRoof = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.55, 4.1), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
  cabRoof.position.set(0, 5.7, -2.4);

  var boiler = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 5.4, 20), new THREE.MeshStandardMaterial({ color: primaryHex, roughness: 0.3 }));
  boiler.rotation.x = Math.PI / 2; boiler.position.set(0, 2.9, 1.6); boiler.castShadow = true;

  // Expressive Cartoon Eyes & Smiling Mouth right on the front of the train!
  var frontFace = createCartoonFacePlane(2.7, 2.7, isBullet ? '#38bdf8' : '#facc15');
  frontFace.position.set(0, 2.9, 4.38);

  var chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.48, 2.2, 14), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
  chimney.position.set(0, 4.8, 3.0);

  var wSide = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.4, 1.9), sharedWindowMat);
  wSide.position.set(0, 4.1, -2.4);
  g.add(cabin, cabRoof, boiler, frontFace, chimney, wSide);

  var wheelMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4 });
  var rimMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
  [-2.6, 0.0, 2.6].forEach(function(wz) {
    [-1.85, 1.85].forEach(function(wx) {
      var wg = new THREE.Group();
      wg.position.set(wx, 0.95, wz);
      var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.3, 16), wheelMat);
      disc.rotation.z = Math.PI / 2;
      var spoke = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.7, 0.25), rimMat);
      wg.add(disc, spoke);
      g.add(wg);
      wheelMeshes.push(wg);
    });
  });

  var beam = new THREE.Mesh(
    new THREE.ConeGeometry(5.2, 24, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
  );
  beam.rotation.x = -Math.PI / 2; beam.position.set(0, 1.8, 16.0);
  g.userData.beam = beam;
  g.add(beam);
  return g;
};

window.createDetailedCoach = function(colHex) {
  var g = new THREE.Group();
  g.scale.set(0.76, 0.76, 0.76);
  var frame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 7.4), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
  frame.position.set(0, 1.0, 0);
  var body = new THREE.Mesh(new THREE.BoxGeometry(3.3, 2.9, 6.6), new THREE.MeshStandardMaterial({ color: colHex, roughness: 0.35 }));
  body.position.set(0, 2.6, 0); body.castShadow = true;
  var roof = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.45, 6.9), new THREE.MeshStandardMaterial({ color: 0xfef08a }));
  roof.position.set(0, 4.2, 0);
  [-2.0, 0.0, 2.0].forEach(function(wz) {
    var wBox = new THREE.Mesh(new THREE.BoxGeometry(3.42, 1.1, 1.3), sharedWindowMat);
    wBox.position.set(0, 2.8, wz);
    g.add(wBox);
  });
  g.add(frame, body, roof);
  return g;
};
