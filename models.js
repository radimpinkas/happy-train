// ============================================================================
// MODULE 3: MODELS.JS (Locomotives, Stations, Animals, Flowers, Bees & City)
// ============================================================================

window.wavingHumans = [];
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

// Build Mid-Segment Stations & Open Depot
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
    var wL = new THREE.Mesh(new THREE.BoxGeometry(2.0, 12, 26), wMat); wL.position.set(-9.0, 6, 0);
    var wR = wL.clone(); wR.position.set(9.0, 6, 0);
    var roof = new THREE.Mesh(new THREE.BoxGeometry(20, 2.2, 27), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    roof.position.set(0, 12.5, 0);
    var dSign = makeSign("🏗️ CENTRAL TRAIN DEPOT", "#0f172a", "#fde047", 25, 5.8);
    dSign.position.set(0, 18, 0);
    depotG.add(wL, wR, roof, dSign);
    scene.add(depotG);
    return;
  }

  if (e.station.type === 'station') {
    var platPos = midPt.clone().add(perp.clone().multiplyScalar(9.5));
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

    var smPos = midPt.clone().add(perp.clone().multiplyScalar(8.5)).add(tan.clone().multiplyScalar(6.5));
    spawnPerson(smPos.x, midPt.y, smPos.z, 0x1e3a8a, 0xdc2626, true, 1.65);

    var pax = [];
    for (var pi = 0; pi < 4; pi++) {
      var startDist = 8.8;
      var along = (pi - 1.5) * 3.0;
      var baseTrackPt = midPt.clone().add(tan.clone().multiplyScalar(along));
      var pPos = baseTrackPt.clone().add(perp.clone().multiplyScalar(startDist));
      var p = spawnPerson(pPos.x, midPt.y, pPos.z, [0xf472b6, 0x22c55e, 0xfacc15, 0x38bdf8][pi], null, false, 1.45);
      pax.push({ human: p, baseTrackPt: baseTrackPt, perp: perp.clone(), dist: startDist, boarded: false });
    }
    stationPhysicals[e.station.name] = { pax: pax, visitedThisEdge: false };
  }
});

// Traffic Signs (STOP, Give Way, No Entry)
function createTrafficSign(x, y, z, type, rotY) {
  var g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY || 0;
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5.2, 8), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6 }));
  pole.position.y = 2.6;
  g.add(pole);

  var c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  var ctx = c.getContext('2d');
  if (type === 'STOP') {
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = (i * Math.PI / 4) + Math.PI / 8;
      var px = 128 + Math.cos(a) * 118, py = 128 + Math.sin(a) * 118;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dc2626'; ctx.beginPath();
    for (var j = 0; j < 8; j++) {
      var a2 = (j * Math.PI / 4) + Math.PI / 8;
      var px2 = 128 + Math.cos(a2) * 104, py2 = 128 + Math.sin(a2) * 104;
      if (j === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = '900 72px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('STOP', 128, 132);
  } else if (type === 'GIVE_WAY') {
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(16, 36); ctx.lineTo(240, 36); ctx.lineTo(128, 236); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(52, 60); ctx.lineTo(204, 60); ctx.lineTo(128, 194); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(128, 128, 114, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(128, 128, 100, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(48, 104, 160, 48);
  }
  var board = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, side: THREE.DoubleSide }));
  board.position.set(0, 5.6, 0.22);
  g.add(board);
  scene.add(g);
}

physicalTracksToRender.forEach(function(e, idx) {
  var p25 = e.curve.getPointAt(0.22);
  var tan = e.curve.getTangentAt(0.22).normalize();
  var perp = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
  var signPos = p25.clone().add(perp.clone().multiplyScalar(-4.8));
  var sType = e.to.indexOf('EXIT_') === 0 ? 'NO_ENTRY' : (idx % 2 === 0 ? 'STOP' : 'GIVE_WAY');
  createTrafficSign(signPos.x, p25.y, signPos.z, sType, Math.atan2(tan.x, tan.z));
});

// Meadow Flowers + Bees & Butterflies
var flowerPositions = [];
var petalColors = [0xf472b6, 0xfacc15, 0x38bdf8, 0xf87171, 0xc084fc, 0xffffff];
var stemMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
var centerMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

for (var fi = 0; fi < 280; fi++) {
  var fx = (Math.random() - 0.5) * 520;
  var fz = (Math.random() - 0.5) * 520;
  if (isNearTrack(fx, fz, 8.0) || Math.abs(fz + 85) < 22) continue;
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
  if (flowerPositions.length < 70) flowerPositions.push(new THREE.Vector3(fx, 1.6, fz));
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

// Detailed 3D Animals
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
    [[-0.45,-0.6], [0.45,-0.6], [-0.45,0.6], [0.45,0.6]].forEach(function(p) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 1.1, 8), darkMat);
      leg.position.set(p[0], 0.55, p[1]); g.add(leg);
    });
  } else if (type === 'cow') {
    var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    var blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.45, 3.1), whiteMat); body.position.y = 1.55;
    var patch1 = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.85, 1.1), blackMat); patch1.position.set(0, 1.7, 0.3);
    var head = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.25), whiteMat); head.position.set(0, 2.25, 1.85);
    var snout = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 0.45), new THREE.MeshStandardMaterial({ color: 0xf472b6 })); snout.position.set(0, 2.0, 2.5);
    g.add(body, patch1, head, snout);
    [[-0.65,-1.1], [0.65,-1.1], [-0.65,1.1], [0.65,1.1]].forEach(function(p) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 1.3, 8), whiteMat);
      leg.position.set(p[0], 0.65, p[1]); g.add(leg);
    });
  } else if (type === 'giraffe') {
    var yelMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24 });
    var spotMat = new THREE.MeshStandardMaterial({ color: 0x92400e });
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 2.9), yelMat); body.position.y = 2.2;
    var spots = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.9, 1.6), spotMat); spots.position.set(0, 2.2, 0);
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.58, 4.6, 8), yelMat); neck.position.set(0, 4.4, 1.35); neck.rotation.x = 0.22;
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 1.35), yelMat); head.position.set(0, 6.5, 2.0);
    g.add(body, spots, neck, head);
    [[-0.6,-1.0], [0.6,-1.0], [-0.6,1.0], [0.6,1.0]].forEach(function(p) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 2.1, 8), yelMat);
      leg.position.set(p[0], 1.05, p[1]); g.add(leg);
    });
  } else {
    var horseMat = new THREE.MeshStandardMaterial({ color: 0x9a3412 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.35, 3.1), horseMat); body.position.y = 1.65;
    var neck = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.8, 0.95), horseMat); neck.position.set(0, 2.6, 1.35); neck.rotation.x = 0.35;
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 1.4), horseMat); head.position.set(0, 3.3, 1.95);
    g.add(body, neck, head);
    [[-0.55,-1.1], [0.55,-1.1], [-0.55,1.1], [0.55,1.1]].forEach(function(p) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 1.5, 8), horseMat);
      leg.position.set(p[0], 0.75, p[1]); g.add(leg);
    });
  }
  return g;
}

var animalTypes = ['sheep', 'cow', 'giraffe', 'horse'];
for (var ai = 0; ai < 48; ai++) {
  var ax = (Math.random() - 0.5) * 500;
  var az = (Math.random() - 0.5) * 500;
  if (isNearTrack(ax, az, 14) || Math.abs(az + 85) < 24) continue;
  var am = createDetailedAnimal(animalTypes[ai % 4]);
  am.position.set(ax, 0, az);
  am.rotation.y = Math.random() * Math.PI * 2;
  scene.add(am);
}

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
    sh.scale.set(0.85, 0.85, 0.85);
    flockG.add(sh);
  }
  var sign = makeSign("🐑 SHEEP ON TRACK!", "#7c2d12", "#fde047", 18, 4.5);
  sign.position.set(0, 5.5, 0);
  flockG.add(sign);
  scene.add(flockG);
  trackSheepFlocks.push({ group: flockG, basePos: pt.clone(), perp: perp, offsetDist: 0, scattering: false, honked: false });
});

// Distant Mountains, Houses, River, Boats, Windmill & Stadium
for (var ma = 0; ma < 36; ma++) {
  var mang = (ma / 36) * Math.PI * 2;
  var mrad = 430 + (ma % 3) * 45;
  var mtn = new THREE.Mesh(
    new THREE.ConeGeometry(52 + (ma % 4) * 14, 65 + (ma % 5) * 18, 12),
    new THREE.MeshStandardMaterial({ color: ma % 2 === 0 ? 0x16a34a : 0x15803d, roughness: 0.9 })
  );
  mtn.position.set(Math.cos(mang) * mrad, 28, Math.sin(mang) * mrad);
  scene.add(mtn);
}

function buildHouse(x, y, z, w, d, h, wallCol, roofCol, title) {
  if (isNearTrack(x, z, Math.max(w, d) * 0.8 + 11)) return;
  var g = new THREE.Group();
  g.position.set(x, y, z);
  var walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.75 }));
  walls.position.y = h / 2; walls.castShadow = true; walls.receiveShadow = true;
  var roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.55, 4), new THREE.MeshStandardMaterial({ color: roofCol }));
  roof.position.y = h + h * 0.27; roof.rotation.y = Math.PI / 4; roof.castShadow = true;
  var door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.5, 0.3), new THREE.MeshStandardMaterial({ color: 0x78350f }));
  door.position.set(0, 1.75, d / 2 + 0.1);
  var w1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  w1.position.set(-w * 0.26, h * 0.6, d / 2 + 0.1);
  var w2 = w1.clone(); w2.position.set(w * 0.26, h * 0.6, d / 2 + 0.1);
  g.add(walls, roof, door, w1, w2);
  if (title) {
    var sp = makeSign(title, '#0f172a', '#fde047', 24, 5.5);
    sp.position.set(0, h + 8.5, 0);
    g.add(sp);
  }
  scene.add(g);
}

buildHouse(-135, 0, -245, 15, 12, 9, 0xfef08a, 0xdc2626, "🏡 MOM & DAD'S HOUSE");
spawnPerson(-125, 0, -232, 0xec4899, null, true, 1.8);
spawnPerson(-121, 0, -232, 0x2563eb, null, true, 1.85);

buildHouse(-265, 0, -110, 15, 12, 8.5, 0xfed7aa, 0x9a3412, "👵 GRANDMA & GRANDPA'S");
spawnPerson(-252, 0, -98, 0xa855f7, null, true, 1.75);
spawnPerson(-248, 0, -98, 0x15803d, null, true, 1.8);

buildHouse( 85, 0, -250, 22, 14, 11, 0xfb923c, 0xb91c1c, "🏫 SUNNY SCHOOL");
buildHouse(135, 0, -250, 16, 13, 9.5, 0xf472b6, 0x831843, "🥐 SWEET BAKERY");
buildHouse(245, 0,  215, 26, 16, 11, 0x3b82f6, 0x1e3a8a, "🛒 MEGA HYPERMARKET");

var wCols = [0xfef08a, 0xbae6fd, 0xfbcfe8, 0xfed7aa, 0xd9f99d];
var rCols = [0xdc2626, 0x1d4ed8, 0x047857, 0x7c2d12, 0x6d28d9];
for (var hx = -260; hx <= 260; hx += 48) {
  for (var hz = -240; hz <= 240; hz += 48) {
    if (Math.abs(hz + 85) < 28) continue;
    var ci = Math.abs(Math.floor(hx + hz)) % wCols.length;
    buildHouse(hx, 0, hz, 10, 9, 7.5 + (ci % 3) * 1.5, wCols[ci], rCols[ci], null);
  }
}

var river = new THREE.Mesh(new THREE.PlaneGeometry(980, 36), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25 }));
river.rotation.x = -Math.PI / 2;
river.position.set(0, 0.08, -85);
scene.add(river);

window.boats = [];
for (var bi = 0; bi < 6; bi++) {
  var bg = new THREE.Group();
  var hull = new THREE.Mesh(new THREE.BoxGeometry(8, 1.8, 3.8), new THREE.MeshStandardMaterial({ color: [0xffffff, 0xef4444, 0xfacc15][bi % 3] }));
  hull.position.y = 0.9;
  var sail = new THREE.Mesh(new THREE.ConeGeometry(2.8, 7.5, 3), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  sail.position.set(0, 5.2, 0);
  bg.add(hull, sail);
  scene.add(bg);
  boats.push({ mesh: bg, x: -250 + bi * 90, dir: bi % 2 === 0 ? 1 : -1, speed: 0.22 });
}

window.windmillBlades = new THREE.Group();
var wmG = new THREE.Group();
wmG.position.set(-150, 0, 260);
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
var stadG = new THREE.Group();
stadG.position.set(-245, 0, 235);
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

// Crossings, Signals & Collectibles
window.activeCrossings = [];
window.roadVehicles = [];
[{ x: -75, z: 228 }, { x: 75, z: 228 }].forEach(function(cr) {
  var cg = new THREE.Group();
  cg.position.set(cr.x, 0.08, cr.z);
  var rd = new THREE.Mesh(new THREE.PlaneGeometry(9, 100), new THREE.MeshStandardMaterial({ color: 0x334155 }));
  rd.rotation.x = -Math.PI / 2;
  var pivotL = new THREE.Group(); pivotL.position.set(-5.2, 2.2, -7.5);
  var armL = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
  armL.position.x = 4.75; pivotL.add(armL);
  var pivotR = new THREE.Group(); pivotR.position.set(5.2, 2.2, 7.5);
  var armR = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
  armR.position.x = -4.75; pivotR.add(armR);
  cg.add(rd, pivotL, pivotR);
  scene.add(cg);

  var cObj = { pos: new THREE.Vector3(cr.x, 0, cr.z), pivotL: pivotL, pivotR: pivotR, isClosed: false };
  activeCrossings.push(cObj);

  [-1, 1].forEach(function(dir) {
    var car = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 4.2), new THREE.MeshStandardMaterial({ color: dir === 1 ? 0xef4444 : 0x3b82f6 }));
    car.position.y = 0.85;
    cg.add(car);
    roadVehicles.push({ mesh: car, crossing: cObj, dir: dir, z: -dir * 24, x: dir * 2.1, speed: 0.25 });
  });
});

window.railwaySignals = {};
Object.keys(nodes).forEach(function(k, idx) {
  var n = nodes[k];
  if (n.isExit) return;
  var sg = new THREE.Group();
  sg.position.set(n.pos.x - 5.5, n.pos.y, n.pos.z + 5.5);
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

// Detailed Locomotive & Passenger Coaches
window.wheelMeshes = [];
window.createDetailedLocomotive = function(primaryHex, cabinHex, isBullet) {
  var g = new THREE.Group();
  g.scale.set(0.75, 0.75, 0.75);
  var chassis = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 8.8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  chassis.position.set(0, 1.1, 0);
  g.add(chassis);

  if (isBullet) {
    var bBody = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 7.8), new THREE.MeshStandardMaterial({ color: primaryHex, roughness: 0.2 }));
    bBody.position.set(0, 2.8, -0.5);
    var bStripe = new THREE.Mesh(new THREE.BoxGeometry(3.58, 0.55, 7.85), new THREE.MeshStandardMaterial({ color: cabinHex }));
    bStripe.position.set(0, 2.2, -0.5);
    var bNose = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5.5, 12), new THREE.MeshStandardMaterial({ color: primaryHex, roughness: 0.2 }));
    bNose.rotation.x = Math.PI / 2; bNose.position.set(0, 2.3, 6.0);
    g.add(bBody, bStripe, bNose);
  } else {
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.2, 3.5), new THREE.MeshStandardMaterial({ color: cabinHex, roughness: 0.4 }));
    cabin.position.set(0, 3.5, -2.4); cabin.castShadow = true;
    var cabRoof = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.45, 4.0), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    cabRoof.position.set(0, 5.7, -2.4);
    var boiler = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 5.4, 20), new THREE.MeshStandardMaterial({ color: primaryHex, roughness: 0.35 }));
    boiler.rotation.x = Math.PI / 2; boiler.position.set(0, 2.9, 1.6); boiler.castShadow = true;

    var brassMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.2 });
    [-0.2, 1.6, 3.4].forEach(function(bz) {
      var ring = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.22, 20), brassMat);
      ring.rotation.x = Math.PI / 2; ring.position.set(0, 2.9, bz);
      g.add(ring);
    });
    var chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 2.1, 14), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    chimney.position.set(0, 4.8, 3.1);
    var cowcatcher = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.8, 4), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
    cowcatcher.rotation.x = Math.PI / 2; cowcatcher.rotation.z = Math.PI / 4; cowcatcher.position.set(0, 1.1, 4.9);
    var wSide = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.3, 1.8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    wSide.position.set(0, 4.1, -2.4);
    g.add(cabin, cabRoof, boiler, chimney, cowcatcher, wSide);
  }

  var wheelMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
  var rimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
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
    new THREE.ConeGeometry(4.8, 22, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
  );
  beam.rotation.x = -Math.PI / 2; beam.position.set(0, 1.8, 15.5);
  g.userData.beam = beam;
  g.add(beam);
  return g;
};

window.createDetailedCoach = function(colHex) {
  var g = new THREE.Group();
  g.scale.set(0.75, 0.75, 0.75);
  var frame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 7.6), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  frame.position.set(0, 1.0, 0);
  var body = new THREE.Mesh(new THREE.BoxGeometry(3.3, 3.2, 6.8), new THREE.MeshStandardMaterial({ color: colHex, roughness: 0.35 }));
  body.position.set(0, 2.8, 0); body.castShadow = true;
  var roof = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.5, 7.1), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
  roof.position.set(0, 4.5, 0);
  var stripe = new THREE.Mesh(new THREE.BoxGeometry(3.36, 0.3, 6.82), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
  stripe.position.set(0, 1.9, 0);
  var winMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
  [-2.0, 0.0, 2.0].forEach(function(wz) {
    var wBox = new THREE.Mesh(new THREE.BoxGeometry(3.42, 1.1, 1.3), winMat);
    wBox.position.set(0, 3.0, wz);
    g.add(wBox);
  });
  g.add(frame, body, roof, stripe);
  return g;
};
