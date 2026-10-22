// ============================================================================
// MODULE 2: TRACKS.JS (Double-Track Railway, Brick Viaduct & 4 Magic Metro Stations)
// ============================================================================

var container = document.getElementById('canvas-container');
window.scene = new THREE.Scene();
window.daySkyColor = new THREE.Color(0x7dd3fc);
window.sunsetSkyColor = new THREE.Color(0xfb923c);
window.nightSkyColor = new THREE.Color(0x090d1c);
window.metroSkyColor = new THREE.Color(0x1e1b4b);

scene.background = daySkyColor.clone();
scene.fog = new THREE.FogExp2(0x7dd3fc, 0.0005);

window.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 1, 2400);
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
var sd = 440;
sunLight.shadow.camera.left = -sd; sunLight.shadow.camera.right = sd;
sunLight.shadow.camera.top = sd; sunLight.shadow.camera.bottom = -sd;
scene.add(sunLight);

var ground = new THREE.Mesh(
  new THREE.PlaneGeometry(3400, 3400),
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
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }));
  sp.scale.set(w || 22, h || 5.5, 1);
  return sp;
};

// --- CITY ORIENTATION NODES + 4 METRO STATIONS ---
window.nodes = {
  J_NW:     { id: 'J_NW',     pos: new THREE.Vector3(-210,  0.2, -190), name: "Mom & Dad's Corner", hasMetro: "🚇 Metro North-West" },
  J_NORTH:  { id: 'J_NORTH',  pos: new THREE.Vector3(   0, 16.0, -220), name: "Sunny School Hilltop" },
  J_NE:     { id: 'J_NE',     pos: new THREE.Vector3( 210,  0.2, -190), name: "North Airport & Grandma", hasMetro: "🚇 Metro North-East" },
  J_EAST:   { id: 'J_EAST',   pos: new THREE.Vector3( 250, 15.0,    0), name: "Grand River Bridge" },
  J_SE:     { id: 'J_SE',     pos: new THREE.Vector3( 210,  0.2,  190), name: "Hypermarket & South Airport", hasMetro: "🚇 Metro South-East" },
  J_SOUTH:  { id: 'J_SOUTH',  pos: new THREE.Vector3(   0,  0.2,  220), name: "Central Train Depot" },
  J_SW:     { id: 'J_SW',     pos: new THREE.Vector3(-210,  0.2,  190), name: "Football Stadium", hasMetro: "🚇 Metro South-West" },
  J_WEST:   { id: 'J_WEST',   pos: new THREE.Vector3(-250, 14.0,    0), name: "Red-Brick Arch Viaduct" },
  J_CENTER: { id: 'J_CENTER', pos: new THREE.Vector3(   0,  0.2,    0), name: "Fountain Central Square" },
  EXIT_ALPS:  { id: 'EXIT_ALPS',  pos: new THREE.Vector3(   0, 16.0, -350), name: "🏔️ Alpine Snow World", isExit: true, unlocked: false },
  EXIT_EGYPT: { id: 'EXIT_EGYPT', pos: new THREE.Vector3( 370,  0.2,  190), name: "🐪 Egypt Pyramids World", isExit: true, unlocked: false }
};

window.edges = [];
window.aiOuterEdges = [];
window.physicalTracksToRender = [];
window.allTrackSamples = [];

// Builds a DOUBLE TRACK: Track 1 (Inner/Right) for Player, Track 2 (Parallel Outer offset by 4.6 units) for AI Trains!
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

  // Parallel Second Track (Offset by 4.6 units so trains NEVER drive through each other!)
  var dirVec = pB.clone().sub(pA).normalize();
  var perp = new THREE.Vector3(-dirVec.z, 0, dirVec.x).normalize().multiplyScalar(4.6);
  var curveParallel = new THREE.CatmullRomCurve3([pA.clone().add(perp), mid.clone().add(perp), pB.clone().add(perp)], false);

  var edgeAB = { id: nodeA + '->' + nodeB, from: nodeA, to: nodeB, curve: curveAB, parallelCurve: curveParallel, station: stationCfg || null };
  var edgeBA = { id: nodeB + '->' + nodeA, from: nodeB, to: nodeA, curve: curveBA, parallelCurve: curveParallel, station: stationCfg || null };

  edges.push(edgeAB, edgeBA);
  physicalTracksToRender.push(edgeAB);

  for (var i = 0; i <= 32; i++) {
    allTrackSamples.push(curveAB.getPointAt(i / 32));
    allTrackSamples.push(curveParallel.getPointAt(i / 32));
  }
}

// 1. Outer Ring with All Key Orientation Landmarks
addBidirectionalTrack('J_NW', 'J_NORTH', 0, 2, -20, {
  type: 'station', name: "🏡 Mom & Dad's House", emoji: "🏡",
  voice: "Look! There is Mom and Dad's house! Mom and Dad are waving hello to you!"
});
addBidirectionalTrack('J_NORTH', 'J_NE', 0, 2, -20, {
  type: 'station', name: "🏫 Sunny School & Kindergarten", emoji: "🏫",
  voice: "Sunny School and Kindergarten on the hill! Look at the children playing!"
});
addBidirectionalTrack('J_NE', 'J_EAST', 25, 4, 0, {
  type: 'bridge_suspension', name: "🌉 Grand River Bridge & Grandma's", emoji: "🌉",
  voice: "Crossing the Grand Bridge near Grandma and Grandpa's cottage!"
});
addBidirectionalTrack('J_EAST', 'J_SE', 25, 0, 0, {
  type: 'tunnel', name: "⛰️ High Hill Tunnel & Hypermarket", emoji: "⛰️",
  voice: "Entering the High Hill Tunnel next to the Mega Hypermarket!"
});
addBidirectionalTrack('J_SE', 'J_SOUTH', 0, 0, 20, {
  type: 'depot', name: "🏗️ Central Train Depot", emoji: "🏗️",
  voice: "Rolling through the Central Train Depot!"
});
addBidirectionalTrack('J_SOUTH', 'J_SW', 0, 0, 20, {
  type: 'station', name: "⚽ City Football Stadium", emoji: "⚽",
  voice: "City Football Stadium! The players are scoring a goal!"
});
addBidirectionalTrack('J_SW', 'J_WEST', -25, 4, 0, {
  type: 'viaduct', name: "🧱 Red-Brick Arch Viaduct", emoji: "🧱",
  voice: "Driving across the Red-Brick Arch Viaduct just like in a storybook!"
});
addBidirectionalTrack('J_WEST', 'J_NW', -25, 0, 0, {
  type: 'station', name: "🌲 Lush Forest Park & Zoo", emoji: "🌲",
  voice: "Lush Forest Park with tall green trees and friendly animals!"
});

// 2. Cross-Town Tracks meeting at Grand Central Fountain Square (J_CENTER)
addBidirectionalTrack('J_NORTH', 'J_CENTER', 0, 0, 0, {
  type: 'station', name: "⛲ Fountain Central Square North", emoji: "⛲",
  voice: "Welcome to Grand Central Square! Look at the sparkling water fountain!"
});
addBidirectionalTrack('J_CENTER', 'J_SOUTH', 0, 0, 0, {
  type: 'station', name: "⛲ Fountain Central Square South", emoji: "⛲",
  voice: "Grand Central Square with the big water fountain!"
});
addBidirectionalTrack('J_WEST', 'J_CENTER', 0, 0, 0, null);
addBidirectionalTrack('J_CENTER', 'J_EAST', 0, 0, 0, null);

// 3. Paid World Exit Spurs
addBidirectionalTrack('J_NORTH', 'EXIT_ALPS', 0, 0, 0, null);
addBidirectionalTrack('J_SE', 'EXIT_EGYPT', 0, 0, 0, null);

// 4. UNDERGROUND MAGIC SUBWAY TUNNEL (Connects the 4 Metro Stations underneath the city!)
window.subwayEdges = [];
function addSubwayLine(fromId, toId, label) {
  var pA = nodes[fromId].pos.clone();
  var pB = nodes[toId].pos.clone();
  var pDip1 = pA.clone().lerp(pB, 0.25); pDip1.y = -22;
  var pMid  = pA.clone().lerp(pB, 0.50); pMid.y  = -24;
  var pDip2 = pA.clone().lerp(pB, 0.75); pDip2.y = -22;
  var curve = new THREE.CatmullRomCurve3([pA, pDip1, pMid, pDip2, pB], false);
  var subEdge = { id: 'METRO_' + fromId + '->' + toId, from: fromId, to: toId, curve: curve, isSubway: true, station: { type: 'subway', name: label, emoji: "🚇" } };
  subwayEdges.push(subEdge);
}
addSubwayLine('J_NW', 'J_SE', "🚇 Underground Gnome Metro Line 1");
addSubwayLine('J_SE', 'J_NW', "🚇 Underground Gnome Metro Line 1");
addSubwayLine('J_NE', 'J_SW', "🚇 Underground Crystal Metro Line 2");
addSubwayLine('J_SW', 'J_NE', "🚇 Underground Crystal Metro Line 2");

window.isNearTrack = function(x, z, minClearance) {
  for (var i = 0; i < allTrackSamples.length; i++) {
    var pt = allTrackSamples[i];
    var dx = x - pt.x, dz = z - pt.z;
    if (dx * dx + dz * dz < minClearance * minClearance) return true;
  }
  return false;
};

window.getBranches = function(edge) {
  var inDir = edge.curve.getTangentAt(1.0).normalize();
  var cands = edges.filter(function(e) {
    return e.from === edge.to && e.to !== edge.from;
  });
  if (cands.length === 0) {
    var fb = edges.find(function(e) { return e.from === edge.to; }) || edge;
    return { left: fb, straight: fb, right: fb };
  }
  var scored = cands.map(function(c) {
    var outDir = c.curve.getTangentAt(0.08).normalize();
    var cross = inDir.z * outDir.x - inDir.x * outDir.z;
    var dot = inDir.x * outDir.x + inDir.z * outDir.z;
    return { edge: c, angle: Math.atan2(cross, dot) };
  });
  scored.sort(function(a, b) { return b.angle - a.angle; });
  if (scored.length === 1) return { left: scored[0].edge, straight: scored[0].edge, right: scored[0].edge };
  if (scored.length === 2) {
    var lE = scored[0].edge, rE = scored[1].edge;
    var sE = Math.abs(scored[0].angle) <= Math.abs(scored[1].angle) ? lE : rE;
    return { left: lE, straight: sE, right: rE };
  }
  var bestSt = scored.slice().sort(function(a, b) { return Math.abs(a.angle) - Math.abs(b.angle); })[0].edge;
  return { left: scored[0].edge, straight: bestSt, right: scored[scored.length - 1].edge };
};

// Render DOUBLE TRACKS + Red-Brick Arch Viaduct (like the reference picture!)
var slGeo = new THREE.BoxGeometry(3.1, 0.22, 0.8);
var slMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
var rlGeo = new THREE.BoxGeometry(0.22, 0.3, 1.7);
var rlMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.65, roughness: 0.3 });
var brickMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.75 }); // Warm Red-Brick like picture!
var hillSlopeMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.9 });

function renderSingleTrackCurve(curve, isMainTrack, e) {
  var steps = Math.floor(curve.getLength() / 2.2);
  var pts = curve.getSpacedPoints(steps);
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    var tan = curve.getTangentAt(i / pts.length);
    var ang = Math.atan2(tan.x, tan.z);

    var sl = new THREE.Mesh(slGeo, slMat);
    sl.position.set(p.x, p.y, p.z);
    sl.rotation.y = ang;
    scene.add(sl);

    var px = Math.cos(ang) * 0.9, pz = -Math.sin(ang) * 0.9;
    var r1 = new THREE.Mesh(rlGeo, rlMat); r1.position.set(p.x + px, p.y + 0.18, p.z + pz); r1.rotation.y = ang;
    var r2 = new THREE.Mesh(rlGeo, rlMat); r2.position.set(p.x - px, p.y + 0.18, p.z - pz); r2.rotation.y = ang;
    scene.add(r1, r2);

    if (isMainTrack && p.y > 1.2 && i % 4 === 0) {
      var isBridge = e.station && (e.station.type === 'bridge_suspension' || e.station.type === 'viaduct');
      if (isBridge) {
        var pier = new THREE.Mesh(new THREE.BoxGeometry(8.8, p.y, 3.2), brickMat);
        pier.position.set(p.x, p.y * 0.5, p.z);
        pier.rotation.y = ang;
        scene.add(pier);
      } else {
        var mound = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.5 + p.y * 1.4, p.y, 12), hillSlopeMat);
        mound.position.set(p.x, p.y * 0.5 - 0.15, p.z);
        scene.add(mound);
      }
    }
  }
}

physicalTracksToRender.forEach(function(e) {
  renderSingleTrackCurve(e.curve, true, e);
  if (e.to.indexOf('EXIT_') === -1) {
    renderSingleTrackCurve(e.parallelCurve, false, e);
  }

  if (!e.station) return;
  if (e.station.type === 'bridge_suspension' || e.station.type === 'viaduct') {
    for (var v = 2; v < 28; v++) {
      var vp = e.curve.getPointAt(v / 30);
      var vtan = e.curve.getTangentAt(v / 30);
      var vang = Math.atan2(vtan.x, vtan.z);
      var vG = new THREE.Group();
      vG.position.copy(vp); vG.rotation.y = vang;
      var vDeck = new THREE.Mesh(new THREE.BoxGeometry(11.5, 1.1, 5.5), brickMat); vDeck.position.y = -0.5;
      var pL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 5.5), brickMat); pL.position.set(-4.2, 0.8, 0);
      var pR = pL.clone(); pR.position.set(8.2, 0.8, 0);
      vG.add(vDeck, pL, pR);
      scene.add(vG);
    }
  } else if (e.station.type === 'tunnel') {
    var rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 });
    var roofMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
    for (var ti = 0; ti <= 16; ti++) {
      var tt = 0.24 + (ti / 16) * 0.52;
      var tp = e.curve.getPointAt(tt);
      var ttan = e.curve.getTangentAt(tt);
      var tang = Math.atan2(ttan.x, ttan.z);
      var ring = new THREE.Group();
      ring.position.copy(tp); ring.rotation.y = tang;
      var wL = new THREE.Mesh(new THREE.BoxGeometry(3.5, 13, 6.5), rockMat); wL.position.set(-8.5, 6.5, 0);
      var wR = wL.clone(); wR.position.set(11.5, 6.5, 0);
      var ceil = new THREE.Mesh(new THREE.BoxGeometry(23.5, 4.5, 6.5), roofMat); ceil.position.set(1.5, 14.2, 0);
      ring.add(wL, wR, ceil);
      scene.add(ring);
    }
  }
});

// Render Underground Magic Subway World (Gnomes, Glowing Crystals & Neon Mushrooms at y = -24!)
window.subwayGnomes = [];
subwayEdges.forEach(function(se, idx) {
  renderSingleTrackCurve(se.curve, false, se);
  if (idx % 2 === 1) return;
  for (var gi = 1; gi <= 14; gi++) {
    var gt = 0.15 + (gi / 16) * 0.7;
    var gp = se.curve.getPointAt(gt);
    var side = (gi % 2 === 0 ? 1 : -1) * 5.5;

    // Magical Glowing Crystal
    var crysCol = [0x38bdf8, 0xf472b6, 0xa855f7, 0x4ade80][gi % 4];
    var crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(2.2, 0),
      new THREE.MeshBasicMaterial({ color: crysCol })
    );
    crystal.position.set(gp.x + side, gp.y + 2.2, gp.z);
    scene.add(crystal);

    // Cute Underground Gnome / Dwarf (Skřítek s červenou čepičkou a bílým plnovousem!)
    var gnome = new THREE.Group();
    gnome.position.set(gp.x - side * 0.8, gp.y, gp.z);
    var gBody = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.8, 8), new THREE.MeshBasicMaterial({ color: 0x2563eb }));
    gBody.position.y = 0.9;
    var gHead = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfde68a }));
    gHead.position.y = 2.1;
    var gBeard = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    gBeard.rotation.x = Math.PI; gBeard.position.set(0, 1.7, 0.35);
    var gHat = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    gHat.position.y = 3.1;
    gnome.add(gBody, gHead, gBeard, gHat);
    scene.add(gnome);
    subwayGnomes.push({ mesh: gnome, baseY: gp.y, phase: gi * 0.8 });
  }
});

// Build 4 Metro Station Entrances at J_NW, J_NE, J_SE, J_SW
['J_NW', 'J_NE', 'J_SE', 'J_SW'].forEach(function(k) {
  var n = nodes[k];
  var mGroup = new THREE.Group();
  mGroup.position.set(n.pos.x, n.pos.y, n.pos.z - 12);
  var arch = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.8, 8, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  var mSign = makeSign(n.hasMetro + " (Press OK)", "#1e1b4b", "#38bdf8", 24, 5.5);
  mSign.position.set(0, 8.5, 0);
  mGroup.add(arch, mSign);
  scene.add(mGroup);
});

window.highlightDots = [];
for (var hi = 0; hi < 22; hi++) {
  var hm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.38, 1.3), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
  scene.add(hm);
  highlightDots.push(hm);
}
