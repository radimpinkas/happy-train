// ============================================================================
// MODULE 2: TRACKS.JS (3D Scene, Elevated Track Graph, Bridges & Junctions)
// ============================================================================

var container = document.getElementById('canvas-container');
window.scene = new THREE.Scene();
window.daySkyColor = new THREE.Color(0x7dd3fc);
window.tunnelSkyColor = new THREE.Color(0x090d16);
scene.background = daySkyColor.clone();
scene.fog = new THREE.FogExp2(0x7dd3fc, 0.00055);

window.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 1, 2200);
window.renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.hemiLight = new THREE.HemisphereLight(0xffffff, 0x4ade80, 0.85);
scene.add(hemiLight);

window.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.05);
sunLight.position.set(240, 420, 220);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
var sd = 420;
sunLight.shadow.camera.left = -sd; sunLight.shadow.camera.right = sd;
sunLight.shadow.camera.top = sd; sunLight.shadow.camera.bottom = -sd;
scene.add(sunLight);

var ground = new THREE.Mesh(
  new THREE.PlaneGeometry(3200, 3200),
  new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.92 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

window.makeSign = function(text, bg, fg, w, h) {
  var c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  var ctx = c.getContext('2d');
  ctx.fillStyle = bg || '#0f172a';
  ctx.fillRect(6, 6, 500, 116);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.fillStyle = fg || '#fde047';
  ctx.font = 'bold 35px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }));
  sp.scale.set(w || 22, h || 5.5, 1);
  return sp;
};

// --- BIDIRECTIONAL TRACK GRAPH ---
window.nodes = {
  J_NW:     { id: 'J_NW',     pos: new THREE.Vector3(-210,  0.2, -190), name: "North-West Junction" },
  J_NORTH:  { id: 'J_NORTH',  pos: new THREE.Vector3(   0, 16.0, -220), name: "Hilltop Summit Junction" },
  J_NE:     { id: 'J_NE',     pos: new THREE.Vector3( 210,  0.2, -190), name: "North-East Valley Junction" },
  J_EAST:   { id: 'J_EAST',   pos: new THREE.Vector3( 250, 15.0,    0), name: "Grand Bridge East Deck" },
  J_SE:     { id: 'J_SE',     pos: new THREE.Vector3( 210,  0.2,  190), name: "South-East Junction" },
  J_SOUTH:  { id: 'J_SOUTH',  pos: new THREE.Vector3(   0,  0.2,  220), name: "South Depot Junction" },
  J_SW:     { id: 'J_SW',     pos: new THREE.Vector3(-210,  0.2,  190), name: "South-West Stadium Junction" },
  J_WEST:   { id: 'J_WEST',   pos: new THREE.Vector3(-250, 14.0,    0), name: "Stone Viaduct West Deck" },
  J_CENTER: { id: 'J_CENTER', pos: new THREE.Vector3(   0,  0.2,    0), name: "Downtown Central Crossroads" },
  EXIT_ALPS:  { id: 'EXIT_ALPS',  pos: new THREE.Vector3(   0, 16.0, -350), name: "🏔️ Alpine Snow World", isExit: true, unlocked: false },
  EXIT_EGYPT: { id: 'EXIT_EGYPT', pos: new THREE.Vector3( 370,  0.2,  190), name: "🐪 Egypt Pyramids World", isExit: true, unlocked: false }
};

window.edges = [];
window.physicalTracksToRender = [];
window.allTrackSamples = [];

function addBidirectionalTrack(nodeA, nodeB, ox, oy, oz, stationCfg) {
  var pA = nodes[nodeA].pos.clone();
  var pB = nodes[nodeB].pos.clone();
  var mid = new THREE.Vector3(
    (pA.x + pB.x) * 0.5 + (ox || 0),
    (pA.y + pB.y) * 0.5 + (oy || 0),
    (pA.z + pB.z) * 0.5 + (oz || 0)
  );

  var curveAB = new THREE.CatmullRomCurve3([pA, mid, pB], false);
  var curveBA = new THREE.CatmullRomCurve3([pB.clone(), mid.clone(), pA.clone()], false);

  var edgeAB = { id: nodeA + '->' + nodeB, from: nodeA, to: nodeB, curve: curveAB, station: stationCfg || null, isPrimary: true };
  var edgeBA = { id: nodeB + '->' + nodeA, from: nodeB, to: nodeA, curve: curveBA, station: stationCfg || null, isPrimary: false };

  edges.push(edgeAB, edgeBA);
  physicalTracksToRender.push(edgeAB);

  for (var i = 0; i <= 32; i++) {
    allTrackSamples.push(curveAB.getPointAt(i / 32));
  }
}

addBidirectionalTrack('J_NW', 'J_NORTH', 0, 2, -20, {
  type: 'station', name: "🏡 Mom & Dad's Hill Climb", emoji: "🏡",
  voice: "Passing Mom and Dad's house on the hill! Look at Mom and Dad waving!"
});
addBidirectionalTrack('J_NORTH', 'J_NE', 0, 2, -20, {
  type: 'station', name: "🏫 Hilltop School & Bakery", emoji: "🏫",
  voice: "Sunny School and Sweet Bakery on the hill!"
});
addBidirectionalTrack('J_NE', 'J_EAST', 25, 4, 0, {
  type: 'bridge_suspension', name: "🌉 Golden Suspension Bridge", emoji: "🌉",
  voice: "Crossing the high Golden Suspension Bridge over the river!"
});
addBidirectionalTrack('J_EAST', 'J_SE', 25, 0, 0, {
  type: 'tunnel', name: "⛰️ Dark Mountain Tunnel", emoji: "⛰️",
  voice: "Driving through the dark Mountain Tunnel!"
});
addBidirectionalTrack('J_SE', 'J_SOUTH', 0, 0, 20, {
  type: 'depot', name: "🏗️ Central Train Depot", emoji: "🏗️",
  voice: "Rolling smoothly through the open Central Train Depot!"
});
addBidirectionalTrack('J_SOUTH', 'J_SW', 0, 0, 20, {
  type: 'station', name: "⚽ Football Stadium Station", emoji: "⚽",
  voice: "Football Stadium Station! Watch the players kick the soccer ball!"
});
addBidirectionalTrack('J_SW', 'J_WEST', -25, 4, 0, {
  type: 'viaduct', name: "🏛️ High Stone Viaduct Bridge", emoji: "🏛️",
  voice: "Crossing high above the flower valley on the Stone Arch Viaduct!"
});
addBidirectionalTrack('J_WEST', 'J_NW', -25, 0, 0, {
  type: 'station', name: "🦒 Animal Zoo & Grandma's Stop", emoji: "🦒",
  voice: "Animal Zoo Park and Grandma's Cottage! Look at the giraffes and fluffy sheep!"
});

// Clean Straight Cross-Town Tracks through J_CENTER
addBidirectionalTrack('J_NORTH', 'J_CENTER', 0, 0, 0, {
  type: 'station', name: "🏙️ Downtown North Avenue", emoji: "🏙️",
  voice: "Downtown North Station!"
});
addBidirectionalTrack('J_CENTER', 'J_SOUTH', 0, 0, 0, {
  type: 'station', name: "🏙️ Downtown South Avenue", emoji: "🏙️",
  voice: "Downtown South Station!"
});
addBidirectionalTrack('J_WEST', 'J_CENTER', 0, 0, 0, null);
addBidirectionalTrack('J_CENTER', 'J_EAST', 0, 0, 0, null);

// Paid World Exit Spurs
addBidirectionalTrack('J_NORTH', 'EXIT_ALPS', 0, 0, 0, null);
addBidirectionalTrack('J_SE', 'EXIT_EGYPT', 0, 0, 0, null);

window.isNearTrack = function(x, z, minClearance) {
  for (var i = 0; i < allTrackSamples.length; i++) {
    var pt = allTrackSamples[i];
    var dx = x - pt.x, dz = z - pt.z;
    if (dx * dx + dz * dz < minClearance * minClearance) return true;
  }
  return false;
};

// Junction Router: Never U-turns onto the incoming track, sorts Left -> Straight -> Right
window.getBranches = function(edge) {
  var inDir = edge.curve.getTangentAt(1.0).normalize();
  var cands = edges.filter(function(e) {
    return e.from === edge.to && e.to !== edge.from;
  });

  if (cands.length === 0) {
    var fallback = edges.find(function(e) { return e.from === edge.to; }) || edge;
    return { left: fallback, straight: fallback, right: fallback };
  }

  var scored = cands.map(function(c) {
    var outDir = c.curve.getTangentAt(0.08).normalize();
    var cross = inDir.z * outDir.x - inDir.x * outDir.z;
    var dot = inDir.x * outDir.x + inDir.z * outDir.z;
    return { edge: c, angle: Math.atan2(cross, dot) };
  });

  scored.sort(function(a, b) { return b.angle - a.angle; });

  if (scored.length === 1) {
    return { left: scored[0].edge, straight: scored[0].edge, right: scored[0].edge };
  }
  if (scored.length === 2) {
    var lEdge = scored[0].edge;
    var rEdge = scored[1].edge;
    var sEdge = Math.abs(scored[0].angle) <= Math.abs(scored[1].angle) ? lEdge : rEdge;
    return { left: lEdge, straight: sEdge, right: rEdge };
  }

  var bestStraight = scored.slice().sort(function(a, b) { return Math.abs(a.angle) - Math.abs(b.angle); })[0].edge;
  return {
    left: scored[0].edge,
    straight: bestStraight,
    right: scored[scored.length - 1].edge
  };
};

// Render Rails, Sleepers, Hills, Bridges & Tunnel
var slGeo = new THREE.BoxGeometry(3.2, 0.22, 0.8);
var slMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
var rlGeo = new THREE.BoxGeometry(0.24, 0.3, 1.7);
var rlMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.65, roughness: 0.3 });
var pierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
var hillSlopeMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.9 });

physicalTracksToRender.forEach(function(e) {
  var steps = Math.floor(e.curve.getLength() / 2.1);
  var pts = e.curve.getSpacedPoints(steps);
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    var tan = e.curve.getTangentAt(i / pts.length);
    var ang = Math.atan2(tan.x, tan.z);

    var sl = new THREE.Mesh(slGeo, slMat);
    sl.position.set(p.x, p.y, p.z);
    sl.rotation.y = ang;
    scene.add(sl);

    var px = Math.cos(ang) * 0.92, pz = -Math.sin(ang) * 0.92;
    var r1 = new THREE.Mesh(rlGeo, rlMat); r1.position.set(p.x + px, p.y + 0.18, p.z + pz); r1.rotation.y = ang;
    var r2 = new THREE.Mesh(rlGeo, rlMat); r2.position.set(p.x - px, p.y + 0.18, p.z - pz); r2.rotation.y = ang;
    scene.add(r1, r2);

    if (p.y > 1.2 && i % 4 === 0) {
      var isBridge = e.station && (e.station.type === 'bridge_suspension' || e.station.type === 'viaduct');
      if (isBridge) {
        var pier = new THREE.Mesh(new THREE.BoxGeometry(3.8, p.y, 2.6), pierMat);
        pier.position.set(p.x, p.y * 0.5, p.z);
        pier.rotation.y = ang;
        scene.add(pier);
      } else {
        var mound = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.5 + p.y * 1.4, p.y, 12), hillSlopeMat);
        mound.position.set(p.x, p.y * 0.5 - 0.15, p.z);
        scene.add(mound);
      }
    }
  }

  if (!e.station) return;
  if (e.station.type === 'bridge_suspension') {
    var steelMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.4, roughness: 0.4 });
    var cableMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.5 });
    [0.28, 0.72].forEach(function(bt) {
      var bp = e.curve.getPointAt(bt);
      var btan = e.curve.getTangentAt(bt);
      var bang = Math.atan2(btan.x, btan.z);
      var towerG = new THREE.Group();
      towerG.position.set(bp.x, 0, bp.z);
      towerG.rotation.y = bang;
      var tL = new THREE.Mesh(new THREE.BoxGeometry(1.8, bp.y + 18, 1.8), steelMat);
      tL.position.set(-4.2, (bp.y + 18) * 0.5, 0);
      var tR = tL.clone(); tR.position.set(4.2, (bp.y + 18) * 0.5, 0);
      var topBar = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.8, 1.8), steelMat);
      topBar.position.set(0, bp.y + 16, 0);
      towerG.add(tL, tR, topBar);
      scene.add(towerG);
    });
    for (var s = 2; s < 28; s++) {
      var sp = e.curve.getPointAt(s / 30);
      var stan = e.curve.getTangentAt(s / 30);
      var sang = Math.atan2(stan.x, stan.z);
      var rG = new THREE.Group();
      rG.position.copy(sp); rG.rotation.y = sang;
      var deck = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.6, 5.5), steelMat); deck.position.y = -0.35;
      var railL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, 5.5), cableMat); railL.position.set(-3.4, 1.0, 0);
      var railR = railL.clone(); railR.position.set(3.4, 1.0, 0);
      rG.add(deck, railL, railR);
      scene.add(rG);
    }
    var bSign = makeSign("🌉 GOLDEN SUSPENSION BRIDGE", "#7f1d1d", "#fde047", 26, 6);
    var midB = e.curve.getPointAt(0.5);
    bSign.position.set(midB.x, midB.y + 22, midB.z);
    scene.add(bSign);
  } else if (e.station.type === 'viaduct') {
    var stoneWallMat = new THREE.MeshStandardMaterial({
