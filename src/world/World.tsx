import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createResident, RESIDENT_ROUTE } from "./resident";
import { createSceneryLayout } from "./scenery";
import { createMailbox } from "./mailbox";
import { createFountain } from "./fountain";
import { createBridge, FOOD_COURT_BRIDGE_OPTIONS } from "./bridge";
import { createUniversity, UNIVERSITY_LOCATION } from "./university";
import { createFoodCourt, FOOD_COURT_LOCATION } from "./foodCourt";
import { createFoodCourtFriends } from "./foodCourtFriends";
import { createWorldFraming } from "./framing";
import Icon from "../ui/Icon";
import { MAIL_DOOR_ANGLE, MAIL_LOCATION } from "./mailRoutine";
import "./world.css";

export type Station =
  "home" | "work" | "education" | "viper" | "anime" | "contact" | "food";
type Place = Exclude<Station, "home">;
type WorldProps = {
  station: Station;
  onSelect: (station: Station) => void;
  paused: boolean;
  dark: boolean;
  onReady?: () => void;
  onBearingChange?: (degrees: number) => void;
};
type Motion = {
  object: THREE.Object3D;
  kind: "spin" | "bob" | "orbit";
  speed: number;
  baseY: number;
  phase: number;
};
const PLACES: { id: Place; title: string; color: string }[] = [
  { id: "work", title: "EXPERIENCE", color: "#afa0d2" },
  { id: "education", title: "EDUCATION", color: "#d5a079" },
  { id: "viper", title: "MUSIC", color: "#f19379" },
  { id: "anime", title: "ANIME", color: "#ce432b" },
  { id: "contact", title: "SAY HELLO", color: "#b6cb6b" },
  { id: "food", title: "FOOD COURT", color: "#eeaa62" },
];
const LOCATIONS: Record<Place, THREE.Vector3> = {
  work: new THREE.Vector3(-2.9, 1.35, -2.15),
  education: new THREE.Vector3(
    UNIVERSITY_LOCATION[0],
    1.35,
    UNIVERSITY_LOCATION[2],
  ),
  viper: new THREE.Vector3(-3.15, 0.8, 2.15),
  anime: new THREE.Vector3(2.8, 1.3, 1.85),
  contact: new THREE.Vector3(0.2, 0.95, 4.45),
  food: new THREE.Vector3(FOOD_COURT_LOCATION[0], 1, FOOD_COURT_LOCATION[2]),
};

function buildWorld(scene: THREE.Scene) {
  const world = new THREE.Group();
  scene.add(world);
  const motions: Motion[] = [];
  const nightLights: THREE.PointLight[] = [];
  const nightSurfaces: {
    material: THREE.MeshStandardMaterial;
    strength: number;
  }[] = [];
  const nightGlows: {
    material: THREE.SpriteMaterial | THREE.MeshBasicMaterial;
    opacity: number;
  }[] = [];
  const screens: THREE.MeshStandardMaterial[] = [];
  const labels: Record<Place, THREE.Vector3> = {
    work: new THREE.Vector3(-2.9, 3.98, -2.15),
    education: new THREE.Vector3(
      UNIVERSITY_LOCATION[0],
      3.65,
      UNIVERSITY_LOCATION[2],
    ),
    viper: new THREE.Vector3(-3.45, 0.15, 3.9),
    anime: new THREE.Vector3(3.45, 0.15, 3.55),
    contact: new THREE.Vector3(0.3, 0.15, 5.05),
    food: new THREE.Vector3(),
  };
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (color: string, roughness = 0.72, metalness = 0) => {
    const key = `${color}-${roughness}-${metalness}`;
    if (!materials.has(key))
      materials.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness, metalness }),
      );
    return materials.get(key)!;
  };
  const C = {
    cream: "#f3ead7",
    white: "#fff9eb",
    sand: "#d8cfb8",
    lavender: "#b8a4d6",
    lilac: "#d4c6e8",
    lime: "#d4e97f",
    cobalt: "#485dca",
    blue: "#7f9cbf",
    coral: "#e98c74",
    dark: "#36384a",
    ink: "#25293d",
    gold: "#b7a170",
    green: "#809674",
  };
  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(x, y, z);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function box(
    parent: THREE.Object3D,
    size: [number, number, number],
    p: [number, number, number],
    color: string,
    radius = 0.07,
  ) {
    return mesh(
      new RoundedBoxGeometry(
        ...size,
        3,
        Math.min(radius, ...size.map((s) => s * 0.3)),
      ),
      mat(color),
      parent,
      ...p,
    );
  }
  function cyl(
    parent: THREE.Object3D,
    r1: number,
    r2: number,
    height: number,
    p: [number, number, number],
    color: string,
    segments = 48,
  ) {
    return mesh(
      new THREE.CylinderGeometry(r1, r2, height, segments),
      mat(color),
      parent,
      ...p,
    );
  }
  function ball(
    parent: THREE.Object3D,
    radius: number,
    p: [number, number, number],
    color: string,
  ) {
    return mesh(
      new THREE.SphereGeometry(radius, 24, 16),
      mat(color),
      parent,
      ...p,
    );
  }
  function torus(
    parent: THREE.Object3D,
    radius: number,
    tube: number,
    p: [number, number, number],
    color: string,
  ) {
    return mesh(
      new THREE.TorusGeometry(radius, tube, 10, 72),
      mat(color),
      parent,
      ...p,
    );
  }
  function rod(
    parent: THREE.Object3D,
    a: [number, number, number],
    b: [number, number, number],
    radius: number,
    color: string,
  ) {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b);
    const item = cyl(
      parent,
      radius,
      radius,
      from.distanceTo(to),
      [0, 0, 0],
      color,
      16,
    );
    item.position.copy(from).add(to).multiplyScalar(0.5);
    item.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      to.sub(from).normalize(),
    );
    return item;
  }
  function textureCanvas(
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    width = 768,
    height = 384,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) draw(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }
  function panel(
    parent: THREE.Object3D,
    texture: THREE.Texture,
    width: number,
    height: number,
    p: [number, number, number],
  ) {
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.65,
      emissive: "#ffffff",
      emissiveMap: texture,
      emissiveIntensity: 0.12,
    });
    screens.push(material);
    return mesh(new THREE.PlaneGeometry(width, height), material, parent, ...p);
  }
  const glowTexture = textureCanvas(
    (ctx, w, h) => {
      const gradient = ctx.createRadialGradient(
        w / 2,
        h / 2,
        0,
        w / 2,
        h / 2,
        w / 2,
      );
      gradient.addColorStop(0, "rgba(255,246,202,1)");
      gradient.addColorStop(0.12, "rgba(255,220,143,.7)");
      gradient.addColorStop(0.36, "rgba(255,184,89,.18)");
      gradient.addColorStop(1, "rgba(255,166,67,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    },
    128,
    128,
  );
  function illuminatedBulb(
    parent: THREE.Object3D,
    p: [number, number, number],
    radius: number,
    glowSize: number,
    strength = 3.5,
  ) {
    const material = new THREE.MeshStandardMaterial({
      color: "#f7e5c2",
      roughness: 0.48,
      emissive: "#ffbd62",
      emissiveIntensity: 0,
    });
    nightSurfaces.push({ material, strength });
    const bulb = mesh(
      new THREE.SphereGeometry(radius, 16, 12),
      material,
      parent,
      ...p,
    );
    bulb.castShadow = false;
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: "#ffcf86",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    nightGlows.push({ material: glowMaterial, opacity: 0.72 });
    const glow = new THREE.Sprite(glowMaterial);
    glow.position.set(...p);
    glow.scale.set(glowSize, glowSize, 1);
    parent.add(glow);
    return bulb;
  }
  function lightPool(
    parent: THREE.Object3D,
    x: number,
    z: number,
    diameter: number,
    opacity = 0.25,
  ) {
    const material = new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: "#ffb764",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    nightGlows.push({ material, opacity });
    const pool = mesh(
      new THREE.PlaneGeometry(diameter, diameter),
      material,
      parent,
      x,
      0.035,
      z,
    );
    pool.rotation.x = -Math.PI / 2;
    pool.castShadow = false;
    pool.receiveShadow = false;
  }
  function sign(
    parent: THREE.Object3D,
    title: string,
    sub: string,
    width: number,
    p: [number, number, number],
    bg = C.cream,
    fg = C.dark,
  ) {
    const texture = textureCanvas((ctx, w, h) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = fg;
      ctx.textAlign = "center";
      ctx.font = "700 78px monospace";
      ctx.fillText(title, w / 2, h * 0.46);
      ctx.font = "400 27px monospace";
      ctx.fillText(sub, w / 2, h * 0.7);
    });
    box(
      parent,
      [width + 0.06, width / 2 + 0.06, 0.08],
      [p[0], p[1], p[2] - 0.052],
      bg,
      0.04,
    );
    return panel(parent, texture, width, width / 2, p);
  }
  function station(id: Place, x: number, z: number) {
    const group = new THREE.Group();
    group.name = `${id}-station`;
    group.position.set(x, 0, z);
    group.userData.station = id;
    world.add(group);
    return group;
  }
  // A bevelled, slightly irregular chalk island. The colored strata catch the low afternoon light.
  const shape = new THREE.Shape();
  for (let i = 0; i <= 96; i++) {
    const angle = (i / 96) * Math.PI * 2;
    const radius =
      1 + 0.023 * Math.sin(angle * 5) + 0.013 * Math.cos(angle * 7);
    const x = Math.cos(angle) * 6.9 * radius,
      y = Math.sin(angle) * 5.35 * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const islandGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.56,
    bevelEnabled: true,
    bevelThickness: 0.15,
    bevelSize: 0.17,
    bevelSegments: 4,
    steps: 1,
    curveSegments: 64,
  });
  islandGeo.rotateX(-Math.PI / 2);
  mesh(islandGeo, mat("#e5decb"), world, 0, -0.69, 0);
  const topGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.12,
    bevelSegments: 3,
    steps: 1,
  });
  topGeo.rotateX(-Math.PI / 2);
  mesh(topGeo, mat("#eee8d9"), world, 0, -0.15, 0);
  const terrainRing = new THREE.EllipseCurve(
    0,
    0,
    6.6,
    5.07,
    0,
    Math.PI * 2,
    false,
    0,
  ).getPoints(128);
  const rimGeo = new THREE.BufferGeometry().setFromPoints(
    terrainRing.map((v) => new THREE.Vector3(v.x, -0.49, v.y)),
  );
  world.add(
    new THREE.LineLoop(
      rimGeo,
      new THREE.LineBasicMaterial({
        color: "#c8bfaa",
        transparent: true,
        opacity: 0.4,
      }),
    ),
  );

  // Inset paving joins every little place, with stepping stones off the main trail.
  const paving: THREE.Mesh[] = [];
  function path(points: [number, number, number][], count: number, scale = 1) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1),
        p = curve.getPoint(t),
        tangent = curve.getTangent(t);
      const stone = box(
        world,
        [(0.57 + 0.08 * Math.sin(i * 3)) * scale, 0.065, 0.36 * scale],
        [p.x, -0.01, p.z],
        i % 4 === 0 ? "#d8d0be" : "#dfd7c7",
        0.11,
      );
      stone.name = "path-stone";
      paving.push(stone);
      stone.rotation.y =
        Math.atan2(tangent.x, tangent.z) + 0.12 * Math.sin(i * 5);
    }
  }
  path(
    [
      [-4.1, 0, 0.2],
      [-1.1, 0, -0.4],
      [0.7, 0, -0.7],
      [4, 0, -0.15],
    ],
    16,
  );
  path(
    [
      [-0.3, 0, 4.55],
      [-0.75, 0, 2.5],
      [-0.3, 0, 1],
      [0.7, 0, -0.7],
    ],
    13,
  );
  path(
    [
      [-0.75, 0, 2.5],
      [-1.8, 0, 2.9],
      [-3.4, 0, 3.15],
    ],
    7,
  );
  path(
    [
      [0.2, 0, 1.8],
      [1, 0, 2.8],
      [3.3, 0, 3.1],
    ],
    8,
  );
  path(
    [
      [4.32, 0, -0.31],
      [4.7, 0, -0.44],
      [5.15, 0, -0.32],
      [5.55, 0, -0.12],
      [
        FOOD_COURT_BRIDGE_OPTIONS.start[0],
        0,
        FOOD_COURT_BRIDGE_OPTIONS.start[2],
      ],
    ],
    7,
    0.72,
  );

  // WORKSHOP / an open studio with a little working robot, a code screen, and a slatted canopy.
  const work = station("work", -2.9, -2.15);
  box(work, [3.55, 0.19, 3.1], [0, 0.1, 0], C.sand, 0.13);
  box(work, [3.36, 0.12, 2.92], [0, 0.25, 0], C.cream, 0.1);
  box(work, [3.12, 2.2, 0.24], [0, 1.38, -1.12], C.lavender, 0.1);
  box(work, [0.23, 2.25, 2.18], [-1.46, 1.4, -0.16], C.lilac, 0.09);
  box(work, [0.2, 1.1, 0.85], [1.46, 0.86, -0.73], C.lilac, 0.08);
  box(work, [3.5, 0.18, 1.47], [0, 2.57, -0.64], C.cream, 0.08);
  box(work, [3.58, 0.2, 0.18], [0, 2.48, 0.13], C.lime, 0.06);
  for (let i = 0; i < 9; i++)
    box(
      work,
      [0.13, 0.07, 1.5],
      [-1.45 + i * 0.365, 2.7, -0.64],
      C.white,
      0.025,
    );
  rod(work, [1.46, 0.3, 0.15], [1.46, 2.4, 0.15], 0.045, C.gold);
  // The circular service window and its pale blue glazing.
  const window = cyl(work, 0.52, 0.52, 0.08, [0.74, 1.59, -0.96], C.cream);
  window.rotation.x = Math.PI / 2;
  const glass = cyl(work, 0.44, 0.44, 0.09, [0.74, 1.59, -0.89], C.blue);
  glass.rotation.x = Math.PI / 2;
  rod(work, [0.31, 1.59, -0.827], [1.17, 1.59, -0.827], 0.025, C.cream);
  rod(work, [0.74, 1.16, -0.827], [0.74, 2.02, -0.827], 0.025, C.cream);
  sign(
    work,
    "BUILD",
    "IDEAS → USEFUL THINGS",
    1.25,
    [-0.72, 1.94, -0.972],
    C.lavender,
    "#fff9ee",
  );
  box(work, [2.65, 0.15, 0.98], [0, 1.03, 0.38], C.cream, 0.065);
  for (const x of [-1.05, 1.05])
    for (const z of [0.04, 0.69])
      rod(work, [x, 0.31, z], [x, 0.99, z], 0.055, C.gold);
  box(work, [1.17, 0.73, 0.1], [-0.3, 1.6, 0.13], C.dark, 0.055);
  rod(work, [-0.3, 1.1, 0.13], [-0.3, 1.3, 0.13], 0.045, C.dark);
  box(work, [0.4, 0.045, 0.23], [-0.3, 1.13, 0.2], C.dark, 0.035);
  const codeTexture = textureCanvas((ctx, w, h) => {
    ctx.fillStyle = "#263446";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#94a2ac";
    ctx.font = "22px monospace";
    ctx.fillText("~/ a little better every day", 36, 46);
    const colors = ["#c6df88", "#e7b28e", "#aaa8db", "#9bced5"];
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = colors[i % 4];
      ctx.fillRect(42 + (i % 3) * 30, 88 + i * 31, 130 + ((i * 83) % 380), 12);
    }
    ctx.fillStyle = "#bddd77";
    ctx.fillRect(650, 292, 40, 40);
  });
  panel(work, codeTexture, 1.07, 0.61, [-0.3, 1.6, 0.188]);
  box(work, [0.74, 0.025, 0.26], [-0.3, 1.1175, 0.67], C.lavender, 0.02);
  for (let i = 0; i < 8; i++)
    box(
      work,
      [0.045, 0.009, 0.15],
      [-0.57 + i * 0.075, 1.1355, 0.67],
      C.cream,
      0.002,
    );
  cyl(work, 0.1, 0.09, 0.19, [0.83, 1.2, 0.65], C.coral, 24);
  const mugHandle = torus(work, 0.07, 0.022, [0.94, 1.22, 0.65], C.coral);
  mugHandle.rotation.y = Math.PI / 2;
  // Articulated cobalt robot, proudly holding a tiny sugar cube.
  cyl(work, 0.27, 0.31, 0.19, [1.0, 1.2, 0.1], C.cobalt);
  rod(work, [1.0, 1.28, 0.1], [1.18, 1.76, 0.13], 0.11, C.cobalt);
  ball(work, 0.15, [1.18, 1.76, 0.13], C.cream);
  rod(work, [1.18, 1.76, 0.13], [0.84, 2.08, 0.4], 0.1, C.cobalt);
  ball(work, 0.12, [0.84, 2.08, 0.4], C.cream);
  rod(work, [0.84, 2.08, 0.4], [0.67, 1.95, 0.53], 0.065, C.gold);
  box(work, [0.23, 0.23, 0.23], [0.62, 1.89, 0.58], C.lime, 0.04).rotation.y =
    0.3;
  // Seat, toolbox, and the roof's gentle spinning ventilator.
  box(work, [0.5, 0.12, 0.61], [-0.3, 0.64, 1.185], C.coral, 0.1);
  box(work, [0.5, 0.42, 0.09], [-0.3, 0.87, 1.46], C.coral, 0.07);
  rod(work, [-0.3, 0.3, 1.12], [-0.3, 0.59, 1.12], 0.06, C.dark);
  box(work, [0.62, 0.35, 0.38], [-1.02, 0.485, 1.15], C.lime, 0.05);
  box(work, [0.22, 0.08, 0.12], [-1.02, 0.695, 1.15], C.gold, 0.02);
  cyl(work, 0.28, 0.3, 0.3, [-0.85, 2.89, -0.76], C.sand);
  rod(work, [-0.85, 3.035, -0.76], [-0.85, 3.11, -0.76], 0.045, C.gold);
  const ventilator = new THREE.Group();
  ventilator.position.set(-0.85, 3.1, -0.76);
  work.add(ventilator);
  for (let i = 0; i < 3; i++) {
    const fin = box(ventilator, [0.73, 0.07, 0.14], [0, 0, 0], C.lime, 0.04);
    fin.rotation.y = (i * Math.PI) / 3;
  }
  motions.push({
    object: ventilator,
    kind: "spin",
    speed: 0.38,
    baseY: 3.1,
    phase: 0,
  });
  rod(work, [1.05, 2.62, -1.05], [1.05, 3.05, -1.05], 0.025, C.dark);
  ball(work, 0.09, [1.05, 3.1, -1.05], C.coral);
  // Three little steps into the workshop.
  box(work, [1.22, 0.065, 0.48], [0.15, 0.0525, 1.63], C.sand, 0.04);
  box(work, [1.06, 0.09, 0.35], [0.15, 0.13, 1.43], C.cream, 0.04);

  // A quiet stone-and-wood fountain garden, with warm light after sunset.
  const fountain = createFountain(world);
  nightSurfaces.push(...fountain.nightSurfaces);
  for (const p of fountain.accentBulbs)
    illuminatedBulb(fountain.object, p, 0.035, 0.38, 1.8);
  illuminatedBulb(fountain.object, fountain.bulbPosition, 0.105, 0.7, 2.6);
  const gardenLight = new THREE.PointLight("#ffc37d", 0, 4.2, 2);
  gardenLight.position.set(...fountain.bulbPosition);
  fountain.object.add(gardenLight);
  nightLights.push(gardenLight);
  lightPool(fountain.object, 0.6, -0.65, 2.1, 0.18);

  // LISTENING ROOM / a monumental little record, walnut speakers, and a quiet seat.
  const viper = station("viper", -3.2, 2.05);
  cyl(viper, 1.52, 1.6, 0.2, [0, 0.12, 0], C.sand, 80);
  cyl(viper, 1.4, 1.46, 0.4, [0, 0.43, 0], C.coral, 80);
  cyl(viper, 1.41, 1.41, 0.1, [0, 0.69, 0], C.cream, 80);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    rod(
      viper,
      [Math.cos(a) * 1.428, 0.3, Math.sin(a) * 1.428],
      [Math.cos(a) * 1.428, 0.57, Math.sin(a) * 1.428],
      0.016,
      "#c46d57",
    );
  }
  const record = new THREE.Group();
  cyl(viper, 0.4, 0.4, 0.035, [-0.15, 0.751, 0], C.dark, 48);
  record.position.set(-0.15, 0.79, 0);
  viper.add(record);
  cyl(record, 1.03, 1.03, 0.075, [0, 0, 0], C.ink, 80).name = "vinyl-disc";
  for (let i = 0; i < 8; i++) {
    const groove = torus(
      record,
      0.42 + i * 0.075,
      0.007,
      [0, 0.04, 0],
      i % 2 ? "#525564" : "#424758",
    );
    groove.rotation.x = Math.PI / 2;
  }
  // A short printed sector makes the vinyl's rotation legible even in flat daylight.
  const vinylPrint = textureCanvas(
    (ctx, w, h) => {
      const r = w / 2;
      ctx.translate(r, h / 2);
      const sector = (inner: number, outer: number, color: string) => {
        ctx.beginPath();
        ctx.arc(0, 0, r * outer, -0.95, -0.49);
        ctx.arc(0, 0, r * inner, -0.49, -0.95, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      };
      sector(0.63, 0.91, "#eee5cd");
      sector(0.91, 0.975, "#df866e");
    },
    512,
    512,
  );
  const printedSector = mesh(
    new THREE.CircleGeometry(1.015, 96),
    new THREE.MeshStandardMaterial({
      map: vinylPrint,
      transparent: true,
      alphaTest: 0.02,
      depthWrite: false,
      roughness: 0.78,
    }),
    record,
    0,
    0.053,
    0,
  );
  printedSector.rotation.x = -Math.PI / 2;
  printedSector.castShadow = false;
  cyl(record, 0.385, 0.385, 0.094, [0, 0.006, 0], C.cream);
  const labelTexture = textureCanvas(
    (ctx, w, h) => {
      ctx.fillStyle = "#efe6cf";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#d97a60";
      ctx.fillRect(0, h * 0.61, w, h * 0.39);
      ctx.fillStyle = "#303343";
      ctx.textAlign = "center";
      ctx.font = "700 132px monospace";
      ctx.fillText("33⅓", w / 2, h * 0.41);
      ctx.fillStyle = "#fff4dd";
      ctx.font = "700 54px monospace";
      ctx.fillText("SIDE A", w / 2, h * 0.82);
    },
    512,
    512,
  );
  const vinylLabel = mesh(
    new THREE.CircleGeometry(0.382, 64),
    new THREE.MeshStandardMaterial({ map: labelTexture, roughness: 0.8 }),
    record,
    0,
    0.064,
    0,
  );
  vinylLabel.rotation.x = -Math.PI / 2;
  vinylLabel.castShadow = false;
  cyl(record, 0.035, 0.035, 0.16, [0, 0.08, 0], C.gold, 16);
  motions.push({
    object: record,
    kind: "spin",
    speed: 0.25,
    baseY: 0.79,
    phase: 0,
  });
  // Keep the pivot's full foot clear of the vinyl and inside the cream deck.
  const pivotX = 1,
    pivotZ = -0.6;
  cyl(viper, 0.16, 0.19, 0.26, [pivotX, 0.87, pivotZ], C.gold).name =
    "tonearm-pivot";
  rod(viper, [pivotX, 1, pivotZ], [1.04, 1, 0.27], 0.045, C.cream);
  rod(viper, [1.04, 1, 0.27], [0.65, 0.99, 0.6], 0.045, C.cream);
  box(viper, [0.19, 0.1, 0.29], [0.62, 0.95, 0.61], C.cobalt, 0.02).rotation.y =
    -0.5;
  rod(viper, [0.62, 0.91, 0.61], [0.62, 0.829, 0.61], 0.009, C.dark);
  for (const [x, z, rotation] of [
    [-2.02, -0.47, -0.1],
    [2.02, -0.47, 0.1],
  ]) {
    const speaker = new THREE.Group();
    speaker.name = x < 0 ? "speaker-left" : "speaker-right";
    speaker.position.set(x, 0.09, z);
    speaker.rotation.y = rotation;
    viper.add(speaker);
    box(speaker, [0.8, 0.125, 0.78], [0, -0.0075, 0], C.sand, 0.045);
    box(speaker, [0.68, 1.41, 0.66], [0, 0.76, 0], C.cream, 0.1);
    box(speaker, [0.53, 1.23, 0.025], [0, 0.77, 0.339], C.coral, 0.045);
    for (const [y, r] of [
      [0.49, 0.2],
      [1.03, 0.125],
    ]) {
      const surround = cyl(
        speaker,
        r + 0.03,
        r + 0.03,
        0.04,
        [0, y, 0.376],
        C.gold,
      );
      surround.rotation.x = Math.PI / 2;
      const cone = cyl(speaker, r, r, 0.045, [0, y, 0.4], C.dark);
      cone.rotation.x = Math.PI / 2;
      ball(speaker, r * 0.31, [0, y, 0.43], C.ink).scale.z = 0.4;
    }
    box(speaker, [0.3, 0.035, 0.026], [0, 1.28, 0.366], C.dark, 0.009);
  }
  // A graceful bent tube canopy, with a sign hung from the center.
  const archCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.65, 0.06, -1.06),
    new THREE.Vector3(-1.65, 2.13, -1.06),
    new THREE.Vector3(-1.12, 2.53, -1.06),
    new THREE.Vector3(1.12, 2.53, -1.06),
    new THREE.Vector3(1.65, 2.13, -1.06),
    new THREE.Vector3(1.65, 0.06, -1.06),
  ]);
  mesh(
    new THREE.TubeGeometry(archCurve, 60, 0.07, 12, false),
    mat(C.coral),
    viper,
  );
  for (const x of [-1.65, 1.65])
    cyl(viper, 0.12, 0.15, 0.1, [x, 0.065, -1.06], C.sand, 24);
  for (const x of [-0.52, 0.52])
    rod(viper, [x, 2.4, -1.06], [x, 2.64, -1.06], 0.016, C.gold);
  sign(
    viper,
    "GOOD VIBES",
    "TUNED BY EAR",
    1.43,
    [0, 2.02, -1.04],
    C.cream,
    C.coral,
  );
  const listeningBench = new THREE.Group();
  listeningBench.name = "listening-bench";
  listeningBench.position.set(0.18, 0, 2.08);
  viper.add(listeningBench);
  box(listeningBench, [0.78, 0.1, 0.39], [0, 0.32, 0], C.lavender, 0.065);
  for (const x of [-0.265, 0.265])
    for (const z of [-0.105, 0.105])
      rod(listeningBench, [x, 0.02, z], [x, 0.28, z], 0.033, C.gold);

  // AFTER HOURS / a vermilion torii opens onto a very small outdoor cinema.
  const anime = station("anime", 2.95, 1.8);
  box(anime, [4, 0.19, 2.62], [0, 0.1, 0], C.sand, 0.13);
  box(anime, [3.8, 0.13, 2.38], [0, 0.26, 0], C.cream, 0.1);
  const vermilion = "#ce432b",
    gateCap = "#30363e";
  const gateMaterial = mat(vermilion);
  gateMaterial.emissive.set("#df442b");
  nightSurfaces.push({ material: gateMaterial, strength: 0.12 });
  for (const side of [-1, 1]) {
    const pillar = cyl(
      anime,
      0.145,
      0.205,
      2.9,
      [side * 1.4, 1.87, 0.39],
      vermilion,
      32,
    );
    pillar.rotation.z = side * 0.058;
    cyl(anime, 0.22, 0.24, 0.2, [side * 1.48, 0.43, 0.39], gateCap, 32);
    cyl(anime, 0.215, 0.24, 0.09, [side * 1.48, 0.32, 0.39], C.sand, 32);
  }
  function curvedGateBeam(
    width: number,
    y: number,
    rise: number,
    thickness: number,
    depth: number,
    color: string,
  ) {
    const profile = new THREE.Shape();
    profile.moveTo(-width / 2, y + rise);
    profile.quadraticCurveTo(0, y - rise, width / 2, y + rise);
    profile.lineTo(width / 2 + 0.035, y + rise + thickness);
    profile.quadraticCurveTo(
      0,
      y - rise + thickness,
      -width / 2 - 0.035,
      y + rise + thickness,
    );
    profile.closePath();
    const geometry = new THREE.ExtrudeGeometry(profile, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.022,
      bevelThickness: 0.02,
      bevelSegments: 2,
      curveSegments: 20,
    });
    return mesh(geometry, mat(color), anime, 0, 0, 0.39 - depth / 2);
  }
  curvedGateBeam(3.62, 3.12, 0.15, 0.2, 0.4, vermilion);
  curvedGateBeam(3.94, 3.33, 0.19, 0.14, 0.58, gateCap);
  box(anime, [3.34, 0.16, 0.24], [0, 2.79, 0.39], vermilion, 0.035);
  box(anime, [0.18, 0.5, 0.19], [0, 3.04, 0.39], vermilion, 0.025);
  box(anime, [0.52, 0.57, 0.055], [0, 3.1, 0.57], "#b7a16d", 0.025);
  const gatePlaque = textureCanvas(
    (ctx, w, h) => {
      ctx.fillStyle = gateCap;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#eee0af";
      ctx.textAlign = "center";
      ctx.font = "700 64px serif";
      ctx.fillText("夜", w / 2, h * 0.61);
      ctx.font = "500 12px monospace";
      ctx.fillText("ANIME", w / 2, h * 0.83);
    },
    192,
    224,
  );
  panel(anime, gatePlaque, 0.45, 0.5, [0, 3.1, 0.604]);
  box(anime, [2.4, 1.5, 0.13], [0, 1.74, -0.3], C.dark, 0.07);
  for (const x of [-0.95, 0.95]) {
    cyl(anime, 0.08, 0.11, 0.045, [x, 0.3475, -0.3], C.gold, 24);
    rod(anime, [x, 0.37, -0.3], [x, 1.05, -0.3], 0.035, C.dark);
  }
  const movie = textureCanvas(
    (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#acb5de");
      sky.addColorStop(1, "#eadaca");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff5cc";
      ctx.beginPath();
      ctx.arc(w * 0.69, h * 0.28, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#858db4";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.8);
      ctx.lineTo(w * 0.36, h * 0.24);
      ctx.lineTo(w * 0.63, h);
      ctx.lineTo(0, h);
      ctx.fill();
      ctx.fillStyle = "#f1e5df";
      ctx.beginPath();
      ctx.moveTo(w * 0.36, h * 0.24);
      ctx.lineTo(w * 0.28, h * 0.4);
      ctx.lineTo(w * 0.34, h * 0.38);
      ctx.lineTo(w * 0.4, h * 0.43);
      ctx.lineTo(w * 0.45, h * 0.42);
      ctx.fill();
      ctx.fillStyle = "#626d99";
      ctx.beginPath();
      ctx.moveTo(w * 0.31, h);
      ctx.lineTo(w * 0.77, h * 0.5);
      ctx.lineTo(w, h * 0.72);
      ctx.lineTo(w, h);
      ctx.fill();
      ctx.strokeStyle = "#334665";
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(30, h);
      ctx.bezierCurveTo(85, h * 0.6, 120, 30, 390, 25);
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(80, h * 0.55);
      ctx.lineTo(0, 110);
      ctx.moveTo(180, 73);
      ctx.lineTo(155, 0);
      ctx.stroke();
      for (let i = 0; i < 45; i++) {
        const x = 45 + ((i * 73) % 350),
          y = 22 + ((i * 37) % 128);
        ctx.fillStyle = i % 3 === 0 ? "#eab3ba" : "#f5d1d0";
        ctx.beginPath();
        ctx.arc(x, y, 9 + (i % 7), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fffaf0";
      ctx.textAlign = "right";
      ctx.font = "600 26px monospace";
      ctx.fillText("ANIME", w - 27, h - 25);
    },
    960,
    540,
  );
  panel(anime, movie, 2.25, 1.3, [0, 1.75, -0.22]);
  for (const x of [-1.75, 1.75]) {
    rod(anime, [x, 3.25, 0.39], [x, 2.67, 0.39], 0.018, gateCap);
    const lantern = illuminatedBulb(anime, [x, 2.39, 0.39], 0.23, 1.18, 2.8);
    lantern.scale.y = 1.3;
    for (const y of [2.1, 2.68])
      cyl(anime, 0.12, 0.12, 0.055, [x, y, 0.39], vermilion, 24);
    for (let i = 0; i < 4; i++) {
      const rib = torus(
        anime,
        0.218 - Math.abs(i - 1.5) * 0.028,
        0.01,
        [x, 2.2 + i * 0.125, 0.39],
        "#bda879",
      );
      rib.rotation.x = Math.PI / 2;
    }
    rod(anime, [x, 2.08, 0.39], [x, 1.93, 0.39], 0.016, vermilion);
    lightPool(anime, x, 0.39, 1.2, 0.18);
  }
  box(anime, [1.35, 0.14, 0.42], [0, 0.09, 1.35], C.sand, 0.035);
  box(anime, [1.16, 0.12, 0.31], [0, 0.22, 1.13], C.cream, 0.035);
  // Two tiny cinema seats, deliberately leaving the screen visible.
  for (const x of [-0.67, 0.63]) {
    box(anime, [0.52, 0.12, 0.61], [x, 0.62, 0.71], C.lavender, 0.09);
    box(anime, [0.52, 0.43, 0.12], [x, 0.88, 0.98], C.lavender, 0.08);
    box(anime, [0.39, 0.024, 0.025], [x, 1.018, 1.052], vermilion, 0.008);
    for (const leg of [-0.17, 0.17])
      for (const z of [0.52, 0.88])
        rod(anime, [x + leg, 0.325, z], [x + leg, 0.57, z], 0.033, C.gold);
  }
  box(anime, [0.48, 0.89, 0.44], [1.54, 0.77, 0.89], vermilion, 0.07);
  sign(anime, "TICKET", "ADMIT ONE", 0.4, [1.54, 1, 1.117], C.cream, C.dark);
  box(anime, [0.25, 0.035, 0.024], [1.54, 0.62, 1.123], C.dark, 0.005);
  const ticket = box(
    anime,
    [0.16, 0.16, 0.012],
    [1.54, 0.53, 1.14],
    C.cream,
    0.009,
  );
  ticket.rotation.z = 0.14;

  // Tiny mail pod in the communal garden.
  const contact = station("contact", MAIL_LOCATION[0], MAIL_LOCATION[2]);
  cyl(contact, 0.31, 0.39, 0.13, [0, 0.08, 0], C.sand);
  rod(contact, [0, 0.15, 0], [0, 0.87, 0], 0.07, C.cobalt);
  const mailbox = createMailbox(contact);

  const university = createUniversity(world);
  labels.education
    .set(...university.labelPosition)
    .add(university.object.position);
  nightSurfaces.push(...university.nightSurfaces);
  const bridge = createBridge(world);
  for (const p of bridge.bulbPositions)
    illuminatedBulb(world, p, 0.048, 0.36, 2.6);
  for (const p of university.bulbPositions) {
    illuminatedBulb(university.object, p, 0.085, 0.65, 2.8);
    const light = new THREE.PointLight("#ffc37d", 0, 3.1, 2);
    light.position.set(...p);
    university.object.add(light);
    nightLights.push(light);
  }

  const foodCourt = createFoodCourt(world);
  const foodFriends = createFoodCourtFriends(foodCourt.object);
  foodCourt.object.localToWorld(labels.food.set(...foodCourt.labelPosition));
  nightSurfaces.push(...foodCourt.nightSurfaces);
  const foodBridge = createBridge(world, FOOD_COURT_BRIDGE_OPTIONS);
  for (const p of foodBridge.bulbPositions)
    illuminatedBulb(world, p, 0.048, 0.36, 2.6);
  for (const p of foodCourt.bulbPositions)
    illuminatedBulb(foodCourt.object, p, 0.045, 0.32, 2.2);
  for (const p of foodCourt.lightPositions) {
    const light = new THREE.PointLight("#ffd19b", 0, 3.6, 2);
    light.position.set(...p);
    foodCourt.object.add(light);
    nightLights.push(light);
    lightPool(foodCourt.object, p[0], p[2], 1.5, 0.16);
  }

  // Park bench and a mug waiting for the next idea.
  const bench = new THREE.Group();
  bench.name = "garden-bench";
  bench.position.set(-0.35, 0, -1.5);
  bench.rotation.y = -0.12;
  world.add(bench);
  for (let i = 0; i < 3; i++)
    box(bench, [0.9, 0.065, 0.105], [0, 0.38, -0.14 + i * 0.14], C.cream, 0.02);
  for (const x of [-0.34, 0.34])
    for (const z of [-0.12, 0.13])
      rod(bench, [x, 0.02, z], [x, 0.35, z], 0.035, C.cobalt);
  box(bench, [0.91, 0.24, 0.07], [0, 0.64, -0.22], C.cream, 0.025);
  for (const x of [-0.34, 0.34])
    rod(bench, [x, 0.15, -0.18], [x, 0.7, -0.18], 0.025, C.cobalt);
  const lamps: THREE.Group[] = [];
  // Path lights sit clear of the buildings, including the island's left corner.
  for (const [x, z] of [
    [-1.25, 3.57],
    [0.89, 0.06],
    [-1.05, -0.3],
    [4.87, 0.14],
    [-5.9, 0.9],
  ]) {
    const lamp = new THREE.Group();
    lamp.name = "path-lamp";
    lamps.push(lamp);
    lamp.position.set(x, 0, z);
    world.add(lamp);
    cyl(lamp, 0.14, 0.18, 0.07, [0, 0.03, 0], C.sand, 24);
    rod(lamp, [0, 0.05, 0], [0, 0.62, 0], 0.03, C.gold);
    illuminatedBulb(lamp, [0, 0.72, 0], 0.13, 0.83);
    cyl(lamp, 0.16, 0.05, 0.08, [0, 0.84, 0], C.cobalt, 24);
    const light = new THREE.PointLight("#ffc37d", 0, 3.9, 2);
    light.position.set(x, 0.81, z);
    world.add(light);
    nightLights.push(light);
    lightPool(world, x, z, 2.15);
  }
  const scenery = createSceneryLayout(
    shape.getPoints().map((p) => ({ x: p.x, z: -p.y })),
    RESIDENT_ROUTE.map((leg) =>
      (leg.points ?? [leg.from.position, leg.to.position]).map(([x, , z]) => ({
        x,
        z,
      })),
    ),
  );
  for (const prop of [
    work,
    fountain.object,
    bridge.object,
    foodBridge.object,
    viper,
    anime,
    contact,
    bench,
    ...lamps,
  ])
    scenery.reserve(prop);
  // Reserve the whole door sweep as well as its closed footprint.
  for (const fraction of [0.25, 0.5, 0.75, 1]) {
    mailbox.door.rotation.y = MAIL_DOOR_ANGLE * fraction;
    scenery.reserve(mailbox.door);
  }
  mailbox.door.rotation.y = 0;
  // Paving is allowed on the walking route, but never through a plinth or furniture.
  for (const stone of paving) {
    const bounds = new THREE.Box3().setFromObject(stone);
    const radius =
      Math.hypot(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) / 2;
    if (!scenery.clear(stone.position.x, stone.position.z, radius, false)) {
      world.remove(stone);
      stone.geometry.dispose();
    }
  }
  // A small orchard with the same quiet, elongated silhouettes as the miniature garden.
  const foliageGeometry = new THREE.SphereGeometry(1, 24, 16);
  const fruitGeometry = new THREE.SphereGeometry(1, 12, 10);
  const leafGeometry = new THREE.SphereGeometry(1, 8, 6);
  const stemGeometry = new THREE.CylinderGeometry(1, 1.2, 1, 6);
  type PlantInstance = {
    position: [number, number, number];
    scale: [number, number, number];
    rotation?: [number, number, number];
  };
  function plantInstances(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    color: string,
    instances: PlantInstance[],
  ) {
    const batch = new THREE.InstancedMesh(
      geometry,
      mat(color),
      instances.length,
    );
    const transform = new THREE.Object3D();
    instances.forEach((instance, index) => {
      transform.position.set(...instance.position);
      transform.scale.set(...instance.scale);
      transform.rotation.set(...(instance.rotation ?? [0, 0, 0]));
      transform.updateMatrix();
      batch.setMatrixAt(index, transform.matrix);
    });
    batch.instanceMatrix.needsUpdate = true;
    batch.castShadow = true;
    batch.receiveShadow = true;
    parent.add(batch);
    return batch;
  }
  function fruitTree(
    x: number,
    z: number,
    height: number,
    variety: "apple" | "orange",
    routeClearanceChecked = false,
  ) {
    const footing = height < 1.2 ? 0.22 : 0.27;
    const spot =
      routeClearanceChecked && scenery.clear(x, z, footing + 0.05, false)
        ? { x, z }
        : scenery.findSpot(x, z, footing + 0.05);
    if (!spot) return;
    x = spot.x;
    z = spot.z;
    scenery.addDisc(x, z, footing + 0.05);
    const group = new THREE.Group();
    group.name = `${variety}-tree`;
    group.position.set(x, 0, z);
    world.add(group);
    const bark = "#a58c69";
    const foliage =
      variety === "apple" ? ["#a4b384", "#8fa37a"] : ["#8c9f75", "#7a916d"];
    cyl(group, footing, footing + 0.05, 0.1, [0, 0.05, 0], "#ded5c1", 32);
    const trunk = cyl(
      group,
      0.025 * height,
      0.038 * height,
      0.69 * height,
      [0.008 * height, 0.35 * height, 0],
      bark,
      10,
    );
    trunk.rotation.z = -0.035;
    rod(
      group,
      [0, 0.34 * height, 0],
      [-0.135 * height, 0.63 * height, 0.04 * height],
      0.017 * height,
      bark,
    );
    const lobes = [
      [0.025, 0.8, 0, 0.225, 0.35, 0.23],
      [-0.135, 0.625, 0.035, 0.165, 0.225, 0.175],
    ];
    lobes.forEach(([lx, ly, lz, sx, sy, sz], index) => {
      const crown = mesh(
        foliageGeometry,
        mat(foliage[index % foliage.length]),
        group,
        lx * height,
        ly * height,
        lz * height,
      );
      crown.scale.set(sx * height, sy * height, sz * height);
    });
    // Four small accents sit partly inside the leaves instead of hanging off the silhouette.
    const accents = [
      [0, 0.59, 0.4, 0.7],
      [0, -0.45, 0.08, 0.89],
      [0, 0.17, -0.5, 0.85],
      [1, -0.38, -0.15, 0.91],
    ];
    const fruit: PlantInstance[] = [],
      stems: PlantInstance[] = [],
      leaves: PlantInstance[] = [];
    accents.forEach(([lobe, dx, dy, dz], index) => {
      const [cx, cy, cz, sx, sy, sz] = lobes[lobe];
      const direction = new THREE.Vector3(dx, dy, dz).normalize();
      const radius =
        height *
        (variety === "apple" ? 0.038 : 0.035) *
        (index === 2 ? 0.92 : 1);
      const position: [number, number, number] = [
        (cx + direction.x * sx * 0.96) * height,
        (cy + direction.y * sy * 0.96) * height,
        (cz + direction.z * sz * 0.96) * height,
      ];
      fruit.push({
        position,
        scale: [
          radius,
          radius * (variety === "apple" ? 0.91 : 1),
          radius * 0.94,
        ],
      });
      const top = position[1] + radius * 0.82;
      stems.push({
        position: [position[0], top + 0.009 * height, position[2]],
        scale: [0.004 * height, 0.024 * height, 0.004 * height],
        rotation: [0, 0, -0.16],
      });
      leaves.push({
        position: [
          position[0] + radius * 0.35,
          top + 0.014 * height,
          position[2],
        ],
        scale: [radius * 0.45, radius * 0.08, radius * 0.17],
        rotation: [0.25, index * 0.67, 0.4],
      });
    });
    plantInstances(
      group,
      fruitGeometry,
      variety === "apple" ? "#c65744" : "#dfa049",
      fruit,
    );
    plantInstances(group, stemGeometry, "#6d5038", stems);
    plantInstances(
      group,
      leafGeometry,
      variety === "apple" ? "#416b3f" : "#385d37",
      leaves,
    );
  }
  function sakuraTree(x: number, z: number) {
    const spot = scenery.findSpot(x, z, 0.34);
    if (!spot) return;
    x = spot.x;
    z = spot.z;
    scenery.addDisc(x, z, 0.34);
    const group = new THREE.Group();
    group.name = "sakura-tree";
    group.position.set(x, 0, z);
    world.add(group);
    const bark = "#997c75";
    cyl(group, 0.29, 0.34, 0.1, [0, 0.05, 0], "#ded5c1", 32);
    rod(group, [0, 0.07, 0], [-0.035, 0.65, 0], 0.052, bark);
    rod(group, [-0.035, 0.65, 0], [0.06, 1.22, -0.05], 0.039, bark);
    rod(group, [0.06, 1.22, -0.05], [0.1, 1.92, -0.12], 0.024, bark);
    rod(group, [-0.02, 0.77, 0], [-0.28, 1.1, 0.025], 0.03, bark);
    rod(group, [-0.28, 1.1, 0.025], [-0.4, 1.46, 0.04], 0.02, bark);
    rod(group, [0.03, 1.04, -0.035], [0.34, 1.36, -0.03], 0.028, bark);
    rod(group, [0.34, 1.36, -0.03], [0.49, 1.7, -0.04], 0.019, bark);
    rod(group, [0.04, 1.18, -0.04], [0.04, 1.6, 0.17], 0.021, bark);
    // Branches carry separate, gently flattened tiers of blossom; the trunk stays visible.
    const crowns = [
      [0.1, 1.92, -0.12, 0.37, 0.23, 0.3],
      [0.43, 1.68, -0.04, 0.4, 0.21, 0.3],
      [-0.36, 1.44, 0.04, 0.38, 0.23, 0.3],
      [0.03, 1.65, 0.17, 0.35, 0.205, 0.275],
    ];
    crowns.forEach(([cx, cy, cz, sx, sy, sz], index) => {
      const crown = mesh(
        foliageGeometry,
        mat(["#edc2c7", "#e8b9c0", "#d7a5b1", "#e2adbb"][index]),
        group,
        cx,
        cy,
        cz,
      );
      crown.scale.set(sx, sy, sz);
      crown.rotation.z = [0.09, -0.12, 0.16, -0.06][index];
      crown.rotation.y = index * 0.4;
    });
    const fallen: PlantInstance[] = Array.from({ length: 6 }, (_, i) => {
      const angle = i * 2.39996,
        radius = 0.36 + (i % 3) * 0.12;
      return {
        position: [Math.cos(angle) * radius, 0.023, Math.sin(angle) * radius],
        scale: [0.027, 0.005, 0.015],
        rotation: [0, angle, 0],
      };
    });
    plantInstances(group, leafGeometry, "#efc1d0", fallen);
  }
  fruitTree(-5.4, -1.5, 1.72, "apple");
  fruitTree(-5.75, -0.48, 1.1, "orange");
  fruitTree(-1.22, -4.2, 1.45, "orange");
  fruitTree(-0.45, -4.48, 1.09, "apple");
  fruitTree(4.65, -2.4, 1.45, "apple");
  // The tucked walking pose clears this tree; retain the garden road's landmark.
  fruitTree(5.47, -0.79, 1.15, "orange", true);
  sakuraTree(5.6, 1.26);
  fruitTree(-5.1, 2.7, 0.9, "apple");
  fruitTree(1.7, 4.35, 0.92, "orange");
  function grass(x: number, z: number, scale = 1) {
    if (!scenery.clear(x, z, 0.19 * scale)) return;
    scenery.addDisc(x, z, 0.19 * scale);
    for (let i = 0; i < 3; i++) {
      const blade = mesh(
        new THREE.ConeGeometry(0.065 * scale, (0.2 + i * 0.055) * scale, 5),
        mat(i % 2 ? C.green : "#aeb788"),
        world,
        x + (i - 1) * 0.1 * scale,
        0.11 * scale,
        z + (i % 2) * 0.07,
      );
      blade.name = "garden-grass";
      blade.rotation.z = (i - 1) * -0.2;
    }
  }
  for (const [x, z, s] of [
    [-5, 1, 1],
    [-1.25, 1.1, 1],
    [1.1, -4.4, 1],
    [4.9, 3, 0.8],
    [-2.3, 4.3, 1],
    [1.7, 4.5, 0.7],
    [-5.3, -3.1, 0.8],
    [5.8, 0.4, 1],
    [0.9, 1.2, 0.75],
  ])
    grass(x, z, s);
  for (let i = 0; i < 18; i++) {
    const a = i * 2.39996,
      radius = 4.7 + 0.35 * Math.sin(i * 4);
    const x = Math.cos(a) * radius * 1.25,
      z = Math.sin(a) * radius;
    const size = 0.11 + (i % 3) * 0.047;
    if (!scenery.clear(x, z, size)) continue;
    scenery.addDisc(x, z, size);
    const rock = mesh(
      new THREE.IcosahedronGeometry(size, 1),
      mat(i % 3 === 0 ? C.lilac : "#d0c9b8"),
      world,
      x,
      0.05,
      z,
    );
    rock.name = "garden-rock";
    rock.scale.y = 0.48;
    rock.rotation.set(0.2, i, 0.3);
  }
  // Fairy strings run between buildings and the garden post, glowing after dark.
  function fairyString(
    start: [number, number, number],
    end: [number, number, number],
    sag: number,
    count: number,
  ) {
    const a = new THREE.Vector3(...start),
      b = new THREE.Vector3(...end);
    const points = Array.from({ length: 49 }, (_, i) => {
      const t = i / 48;
      const point = a.clone().lerp(b, t);
      point.y -= Math.sin(t * Math.PI) * sag;
      return point;
    });
    const curve = new THREE.CatmullRomCurve3(points);
    const wire = mesh(
      new THREE.TubeGeometry(curve, 72, 0.012, 5, false),
      mat("#525449"),
      world,
    );
    wire.castShadow = false;
    for (let i = 1; i < count; i++) {
      const point = curve.getPoint(i / count);
      rod(
        world,
        [point.x, point.y, point.z],
        [point.x, point.y - 0.095, point.z],
        0.014,
        "#625d49",
      );
      illuminatedBulb(
        world,
        [point.x, point.y - 0.13, point.z],
        0.052,
        0.46,
        4.3,
      );
    }
  }
  const gardenAnchor = new THREE.Vector3(...fountain.lightAnchor)
    .add(fountain.object.position)
    .toArray() as [number, number, number];
  fairyString([-1.45, 2.76, -2.05], gardenAnchor, 0.55, 14);
  fairyString(gardenAnchor, [4.34, 3.46, 2.19], 0.66, 15);
  fairyString([-2.1, 2.52, 0.99], [1.53, 3.46, 2.19], 0.58, 12);
  const resident = createResident(world);
  return {
    world,
    resident,
    mailbox,
    fountain,
    university,
    foodCourt,
    foodFriends,
    motions,
    labels,
    nightLights,
    nightSurfaces,
    nightGlows,
    screens,
  };
}

export default function World({
  station: activeStation,
  onSelect,
  paused,
  dark,
  onReady,
  onBearingChange,
}: WorldProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Partial<Record<Place, HTMLButtonElement>>>({});
  const stateRef = useRef({
    station: activeStation,
    paused,
    dark,
    onSelect,
    onReady,
    onBearingChange,
  });
  stateRef.current = {
    station: activeStation,
    paused,
    dark,
    onSelect,
    onReady,
    onBearingChange,
  };
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      stateRef.current.onReady?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor("#eeece5", 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.13;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.className = "mini-world__canvas";
    canvas.setAttribute(
      "aria-label",
      "Interactive miniature world. Choose a labeled place to explore. Drag to turn the island.",
    );
    canvas.setAttribute("role", "img");
    host.prepend(canvas);

    const scene = new THREE.Scene();
    const ambient = new THREE.AmbientLight("#ece9ff", 0.75);
    scene.add(ambient);
    const hemisphere = new THREE.HemisphereLight("#fffaf0", "#b4ab91", 1.5);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight("#fff6df", 3.5);
    sun.position.set(-7, 14, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -17,
      right: 17,
      top: 17,
      bottom: -17,
      near: 0.5,
      far: 45,
    });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 4;
    scene.add(sun);
    const fill = new THREE.DirectionalLight("#d8dcff", 0.8);
    fill.position.set(8, 6, -8);
    scene.add(fill);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ color: "#68614c", opacity: 0.15 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.96;
    ground.receiveShadow = true;
    scene.add(ground);
    let built: ReturnType<typeof buildWorld>;
    try {
      built = buildWorld(scene);
    } catch {
      renderer.dispose();
      canvas.remove();
      setFailed(true);
      stateRef.current.onReady?.();
      return;
    }
    const {
      world,
      resident,
      mailbox,
      fountain,
      university,
      foodCourt,
      foodFriends,
      motions,
      labels,
      nightLights,
      nightSurfaces,
      nightGlows,
      screens,
    } = built;
    const frameWorld = createWorldFraming(world);
    const frameCampus = createWorldFraming(university.object);
    const frameFoodCourt = createWorldFraming(foodCourt.object);
    const intoFoodCourt = foodCourt.object.matrix.clone().invert();
    const visitorPosition = new THREE.Vector3();
    const foodVisit = {
      position: [0, 0, 0] as [number, number, number],
      amount: 0,
      time: 0,
    };
    let nightAmount = stateRef.current.dark ? 1 : 0;
    let lastRenderedNight = -1;
    let lastRenderedBearing = -1;
    let lastRenderedOrbit = Infinity;
    const palette = {
      ambientDay: new THREE.Color("#ece9ff"),
      ambientNight: new THREE.Color("#738fcd"),
      skyDay: new THREE.Color("#fffaf0"),
      skyNight: new THREE.Color("#8daded"),
      groundDay: new THREE.Color("#b4ab91"),
      groundNight: new THREE.Color("#192741"),
      sunDay: new THREE.Color("#fff6df"),
      sunNight: new THREE.Color("#a3beff"),
      fillDay: new THREE.Color("#d8dcff"),
      fillNight: new THREE.Color("#6d92d8"),
      shadowDay: new THREE.Color("#68614c"),
      shadowNight: new THREE.Color("#030713"),
    };
    const sunDayPosition = new THREE.Vector3(-7, 14, 9),
      sunNightPosition = new THREE.Vector3(-6, 12, -8);
    function updateLighting(amount: number) {
      ambient.color.copy(palette.ambientDay).lerp(palette.ambientNight, amount);
      ambient.intensity = THREE.MathUtils.lerp(0.75, 0.43, amount);
      hemisphere.color.copy(palette.skyDay).lerp(palette.skyNight, amount);
      hemisphere.groundColor
        .copy(palette.groundDay)
        .lerp(palette.groundNight, amount);
      hemisphere.intensity = THREE.MathUtils.lerp(1.5, 0.73, amount);
      sun.color.copy(palette.sunDay).lerp(palette.sunNight, amount);
      sun.intensity = THREE.MathUtils.lerp(3.5, 1.35, amount);
      sun.position.copy(sunDayPosition).lerp(sunNightPosition, amount);
      fill.color.copy(palette.fillDay).lerp(palette.fillNight, amount);
      fill.intensity = THREE.MathUtils.lerp(0.8, 0.58, amount);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(1.13, 1.02, amount);
      ground.material.color
        .copy(palette.shadowDay)
        .lerp(palette.shadowNight, amount);
      ground.material.opacity = THREE.MathUtils.lerp(0.15, 0.28, amount);
      for (const light of nightLights) light.intensity = amount * 5.6;
      for (const surface of nightSurfaces)
        surface.material.emissiveIntensity = amount * surface.strength;
      for (const glow of nightGlows)
        glow.material.opacity = amount * glow.opacity;
      for (const screen of screens)
        screen.emissiveIntensity = THREE.MathUtils.lerp(0.12, 0.42, amount);
      canvas.dataset.lighting = amount > 0.5 ? "night" : "day";
      canvas.dataset.nightAmount = amount.toFixed(3);
    }
    updateLighting(nightAmount);
    const camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 120);
    const focus = new THREE.Vector3(0, 0.35, 0);
    const desiredFocus = new THREE.Vector3();
    const viewDirection = new THREE.Vector3(11, 14, 19).normalize();
    camera.position.copy(focus).addScaledVector(viewDirection, 28);
    camera.lookAt(focus);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1,
      height = 1,
      frustum = 14,
      zoom = 1,
      lastStation: Station = "home";
    let viewportLeft = 0,
      viewportRight = 1,
      lastRenderWidth = 0,
      lastRenderHeight = 0,
      contextLost = false;
    let orbit = 0,
      targetOrbit = 0,
      lastTime = 0,
      elapsed = 0,
      ready = false,
      disposed = false;
    let worldWasHidden = false;
    let frame = 0,
      visible = !document.hidden;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const projected = new THREE.Vector3();
    const right = new THREE.Vector3();
    function resize() {
      const rect = host!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      viewportLeft = Math.max(0, -rect.left);
      viewportRight = Math.min(width, window.innerWidth - rect.left);
      const aspect = width / height;
      frustum = Math.max(12.3, 17.7 / aspect);
      camera.left = (-frustum * aspect) / 2;
      camera.right = (frustum * aspect) / 2;
      camera.top = frustum / 2;
      camera.bottom = -frustum / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    function hit(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / width) * 2 - 1,
        (-(event.clientY - rect.top) / height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(world, true);
      for (const intersection of hits) {
        let object: THREE.Object3D | null = intersection.object;
        while (object && object !== world) {
          if (object.userData.station) return object.userData.station as Place;
          object = object.parent;
        }
        // Solid scenery in front of a building correctly blocks the click.
        if (
          intersection.object instanceof THREE.Mesh &&
          intersection.object.material &&
          intersection.distance > 0
        )
          break;
      }
      return null;
    }
    let down: { x: number; y: number; orbit: number; id: number } | null = null;
    let dragged = false;
    function pointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      down = {
        x: event.clientX,
        y: event.clientY,
        orbit: targetOrbit,
        id: event.pointerId,
      };
      dragged = false;
      if (
        (stateRef.current.station === "home" ||
          stateRef.current.station === "food") &&
        event.pointerType !== "touch"
      )
        canvas.setPointerCapture(event.pointerId);
    }
    function pointerMove(event: PointerEvent) {
      if (down) {
        const dx = event.clientX - down.x,
          dy = event.clientY - down.y;
        if (Math.hypot(dx, dy) > 7) dragged = true;
        if (
          dragged &&
          (stateRef.current.station === "home" ||
            stateRef.current.station === "food")
        ) {
          targetOrbit = down.orbit - dx * 0.0045;
          canvas.style.cursor = "grabbing";
        }
      } else
        canvas.style.cursor = hit(event)
          ? "pointer"
          : stateRef.current.station === "home" ||
              stateRef.current.station === "food"
            ? "grab"
            : "default";
    }
    function pointerUp(event: PointerEvent) {
      if (!down || down.id !== event.pointerId) return;
      if (!dragged) {
        const place = hit(event);
        if (place) stateRef.current.onSelect(place);
      }
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
      down = null;
      canvas.style.cursor =
        stateRef.current.station === "home" ||
        stateRef.current.station === "food"
          ? "grab"
          : "default";
    }
    function pointerCancel() {
      down = null;
      dragged = false;
    }
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerCancel);
    function visibility() {
      visible = !document.hidden;
      lastTime = 0;
    }
    document.addEventListener("visibilitychange", visibility);
    function lost(event: Event) {
      event.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frame);
      canvas.style.visibility = "hidden";
      setFailed(true);
      stateRef.current.onReady?.();
    }
    canvas.addEventListener("webglcontextlost", lost);

    function animate(time: number) {
      if (disposed || contextLost) return;
      frame = requestAnimationFrame(animate);
      const realDt = lastTime
        ? Math.min((time - lastTime) / 1000, 0.5)
        : 1 / 60;
      const dt = Math.min(realDt, 0.045);
      lastTime = time;
      const {
        station: current,
        paused: isPaused,
        dark: isDark,
      } = stateRef.current;
      const quiet = reduced.matches || isPaused;
      const desiredNight = isDark ? 1 : 0;
      nightAmount =
        quiet || !visible || current === "anime"
          ? desiredNight
          : THREE.MathUtils.lerp(
              nightAmount,
              desiredNight,
              1 - Math.exp(-realDt * 4.5),
            );
      if (Math.abs(nightAmount - desiredNight) < 0.001)
        nightAmount = desiredNight;
      const lightingChanged = nightAmount !== lastRenderedNight;
      if (lightingChanged) updateLighting(nightAmount);
      if (!visible || current === "anime") {
        worldWasHidden = true;
        for (const element of Object.values(labelRefs.current))
          if (element) element.style.visibility = "hidden";
        // The cinema hides this canvas, but a theme change still updates its existing scene once.
        if (lightingChanged) {
          try {
            renderer.render(scene, camera);
            lastRenderedNight = nightAmount;
          } catch {
            contextLost = true;
            canvas.style.visibility = "hidden";
            setFailed(true);
            cancelAnimationFrame(frame);
          }
        }
        if (!ready) {
          ready = true;
          stateRef.current.onReady?.();
        }
        return;
      }
      const revealWorld = worldWasHidden;
      worldWasHidden = false;
      if (current !== lastStation) {
        targetOrbit = current === "work" ? 0.28 : 0;
        lastStation = current;
      }
      const ease = reduced.matches ? 1 : 1 - Math.exp(-dt * 5.3);
      orbit = THREE.MathUtils.lerp(orbit, targetOrbit, ease);
      const dir = viewDirection
        .clone()
        .applyAxisAngle(THREE.Object3D.DEFAULT_UP, orbit);
      right.crossVectors(THREE.Object3D.DEFAULT_UP, dir).normalize();
      let desiredZoom = 1;
      if (current === "home") {
        const framing = frameWorld(dir, width, height);
        desiredFocus.copy(framing.center);
        desiredZoom = frustum / framing.height;
      } else if (current === "food" || current === "education") {
        // Reserve the same horizontal space that the copy's camera offset uses.
        const framePlace =
          current === "education" ? frameCampus : frameFoodCourt;
        const framing = framePlace(
          dir,
          width > 700 ? width * 0.8 : width,
          height,
        );
        desiredFocus.copy(framing.center);
        desiredZoom = frustum / framing.height;
        if (width > 700)
          desiredFocus.addScaledVector(
            right,
            -((frustum * width) / height / desiredZoom) * 0.1,
          );
      } else {
        desiredFocus.copy(LOCATIONS[current]);
        const aspect = width / height;
        desiredZoom =
          current === "contact" ? 2.8 : current === "work" ? 2.05 : 1.83;
        if (aspect < 0.8) desiredZoom *= 0.9;
        const offset =
          ((frustum * aspect) / desiredZoom) * (width > 700 ? 0.12 : 0.02);
        desiredFocus.addScaledVector(right, -offset);
      }
      const settled =
        focus.distanceToSquared(desiredFocus) < 0.000001 &&
        Math.abs(zoom - desiredZoom) < 0.0001 &&
        Math.abs(orbit - targetOrbit) < 0.0001;
      if (
        quiet &&
        settled &&
        ready &&
        !lightingChanged &&
        !revealWorld &&
        Math.abs(orbit - lastRenderedOrbit) < 0.00001 &&
        lastRenderWidth === width &&
        lastRenderHeight === height
      )
        return;
      focus.lerp(desiredFocus, ease);
      zoom = THREE.MathUtils.lerp(zoom, desiredZoom, ease);
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
      camera.position.copy(focus).addScaledVector(dir, 28);
      camera.lookAt(focus);
      camera.updateMatrixWorld();
      if (!quiet) {
        elapsed += dt;
        const residentSample = resident.update(elapsed);
        mailbox.update(residentSample.mail);
        fountain.update(elapsed);
        if (residentSample.activity === "hanging-out") {
          visitorPosition
            .copy(resident.object.position)
            .applyMatrix4(intoFoodCourt);
          visitorPosition.toArray(foodVisit.position);
          foodVisit.amount = residentSample.interaction;
          foodVisit.time = residentSample.activityTime;
          foodFriends.update(elapsed, foodVisit);
        } else {
          foodFriends.update(elapsed);
        }
        for (const motion of motions) {
          if (motion.kind === "spin")
            motion.object.rotation.y += dt * motion.speed;
          if (motion.kind === "bob")
            motion.object.position.y =
              motion.baseY +
              Math.sin(elapsed * motion.speed + motion.phase) * 0.075;
        }
      }
      const occupiedLabels: {
        left: number;
        right: number;
        top: number;
        bottom: number;
      }[] = [];
      for (const place of PLACES) {
        const element = labelRefs.current[place.id];
        if (!element) continue;
        projected.copy(labels[place.id]).project(camera);
        const projectedX = (projected.x * 0.5 + 0.5) * width,
          y = (-projected.y * 0.5 + 0.5) * height;
        const halfWidth = element.offsetWidth / 2;
        let x = THREE.MathUtils.clamp(
          projectedX,
          viewportLeft + halfWidth + 9,
          viewportRight - halfWidth - 9,
        );
        const shown =
          (current === "home" || current === place.id) &&
          projected.z < 1 &&
          projectedX > viewportLeft - 75 &&
          projectedX < viewportRight + 75 &&
          y > 5 &&
          y < height - 36;
        const labelHeight = element.offsetHeight;
        let top = THREE.MathUtils.clamp(y + 8, 9, height - labelHeight - 9);
        if (shown) {
          // Find the nearest free position for readable labels at any bearing.
          // Candidate edges come from labels already placed, not fixed offsets.
          const xs = [
            x,
            viewportLeft + halfWidth + 9,
            viewportRight - halfWidth - 9,
          ];
          const ys = [top, 9, height - labelHeight - 9];
          for (const box of occupiedLabels) {
            xs.push(box.left - halfWidth - 6, box.right + halfWidth + 6);
            ys.push(box.top - labelHeight - 6, box.bottom + 6);
          }
          let nearest = Infinity;
          let nextX = x;
          let nextTop = top;
          for (const candidateX of xs) {
            if (
              candidateX - halfWidth < viewportLeft + 8 ||
              candidateX + halfWidth > viewportRight - 8
            )
              continue;
            for (const candidateTop of ys) {
              if (candidateTop < 8 || candidateTop + labelHeight > height - 8)
                continue;
              const blocked = occupiedLabels.some(
                (box) =>
                  candidateX + halfWidth + 5 > box.left &&
                  candidateX - halfWidth - 5 < box.right &&
                  candidateTop + labelHeight + 5 > box.top &&
                  candidateTop - 5 < box.bottom,
              );
              const distance =
                (candidateX - x) ** 2 + (candidateTop - top) ** 2;
              if (!blocked && distance < nearest) {
                nearest = distance;
                nextX = candidateX;
                nextTop = candidateTop;
              }
            }
          }
          x = nextX;
          top = nextTop;
          occupiedLabels.push({
            left: x - halfWidth,
            right: x + halfWidth,
            top,
            bottom: top + labelHeight,
          });
        }
        element.style.transform = `translate(${x.toFixed(1)}px, ${top.toFixed(1)}px) translateX(-50%)`;
        element.style.opacity = shown ? "1" : "0";
        element.style.pointerEvents = shown ? "auto" : "none";
        element.style.visibility = shown ? "visible" : "hidden";
      }
      try {
        renderer.render(scene, camera);
        // Local north is +Z. Report the view's eased position, not the drag target.
        const bearing =
          (Math.round(THREE.MathUtils.radToDeg(Math.atan2(dir.x, dir.z))) +
            360) %
          360;
        if (bearing !== lastRenderedBearing) {
          stateRef.current.onBearingChange?.(bearing);
          lastRenderedBearing = bearing;
        }
        lastRenderedOrbit = orbit;
        lastRenderedNight = nightAmount;
        lastRenderWidth = width;
        lastRenderHeight = height;
        if (!ready) {
          ready = true;
          stateRef.current.onReady?.();
        }
      } catch {
        contextLost = true;
        canvas.style.visibility = "hidden";
        setFailed(true);
        stateRef.current.onReady?.();
        cancelAnimationFrame(frame);
      }
    }
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerCancel);
      canvas.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<THREE.BufferGeometry>(),
        disposableMaterials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      scene.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) object.dispose();
        if (object instanceof THREE.Sprite) {
          disposableMaterials.add(object.material);
          if (object.material.map) textures.add(object.material.map);
        }
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          geometries.add(object.geometry);
          const entries = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const material of entries) {
            disposableMaterials.add(material);
            for (const value of Object.values(material))
              if (value instanceof THREE.Texture) textures.add(value);
          }
        }
      });
      textures.forEach((texture) => texture.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      disposableMaterials.forEach((material) => material.dispose());
      sun.shadow.map?.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="mini-world"
      aria-label="Explore syntaxticsugr's miniature world"
    >
      {failed ? (
        <div className="mini-world__fallback">
          <div className="mini-world__fallback-mark" aria-hidden="true">
            ✦
          </div>
          <p>My work, audio presets, and anime watchlist.</p>
          <div className="mini-world__fallback-nav">
            {PLACES.map((place) => (
              <button key={place.id} onClick={() => onSelect(place.id)}>
                {place.title}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mini-world__labels">
          {PLACES.map((place) => (
            <button
              key={place.id}
              ref={(element) => {
                if (element) labelRefs.current[place.id] = element;
              }}
              className="mini-world__label"
              aria-label={`Explore ${place.title.toLowerCase()}`}
              aria-pressed={activeStation === place.id}
              style={{ "--station-color": place.color } as React.CSSProperties}
              onClick={() => onSelect(place.id)}
            >
              <b aria-hidden="true" />
              <span>{place.title}</span>
              <Icon
                name="arrow-up-right"
                size={16}
                className="mini-world__label-arrow"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
