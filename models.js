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
    var head = new THREE.
