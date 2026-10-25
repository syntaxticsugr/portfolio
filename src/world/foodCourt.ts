import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const FOOD_COURT_LOCATION = [12.7, 0, -0.25] as const;
export const FOOD_COURT_ROTATION = Math.PI / 2;

type Point = [number, number, number];

/** A small, lantern-lit food market. Positions returned here are island-local. */
export function createFoodCourt(parent: THREE.Object3D) {
  const object = new THREE.Group();
  object.name = "food-court-island";
  object.position.set(...FOOD_COURT_LOCATION);
  // The entrance faces the end of the main island's garden road.
  object.rotation.y = FOOD_COURT_ROTATION;
  object.userData.station = "food";
  parent.add(object);

  const nightSurfaces: {
    material: THREE.MeshStandardMaterial;
    strength: number;
  }[] = [];
  const bulbPositions: Point[] = [];
  const lightPositions: Point[] = [];
  const material = (color: string, roughness = 0.82) =>
    new THREE.MeshStandardMaterial({ color, roughness });
  const cream = material("#f3ead7");
  const porcelain = material("#fff9eb", 0.36);
  const sand = material("#d8cfb8");
  const coral = material("#e98c74");
  const coralDark = material("#b9624f");
  const saffron = material("#e6b24c");
  const cobalt = material("#485dca");
  const ink = material("#25293d");
  const mint = material("#96baa5");
  const wood = material("#b89360");
  const woodLight = material("#c7a87a");
  const woodDark = material("#826044");
  const gold = material("#b7a170", 0.47);
  const green = material("#809674");
  const leaf = material("#a3b684");
  const red = material("#cc604e");
  const tea = material("#a76736", 0.35);
  const steel = new THREE.MeshStandardMaterial({
    color: "#9ca6aa",
    roughness: 0.36,
    metalness: 0.4,
  });

  function mesh(
    owner: THREE.Object3D,
    name: string,
    geometry: THREE.BufferGeometry,
    surface: THREE.Material,
    position: Point,
  ) {
    const part = new THREE.Mesh(geometry, surface);
    part.name = name;
    part.position.set(...position);
    part.castShadow = true;
    part.receiveShadow = true;
    owner.add(part);
    return part;
  }

  function box(
    owner: THREE.Object3D,
    name: string,
    size: Point,
    position: Point,
    surface: THREE.Material,
    radius = 0.035,
  ) {
    return mesh(
      owner,
      name,
      new RoundedBoxGeometry(
        ...size,
        3,
        Math.min(radius, ...size.map((n) => n * 0.3)),
      ),
      surface,
      position,
    );
  }

  function cylinder(
    owner: THREE.Object3D,
    name: string,
    top: number,
    bottom: number,
    height: number,
    position: Point,
    surface: THREE.Material,
    segments = 24,
  ) {
    return mesh(
      owner,
      name,
      new THREE.CylinderGeometry(top, bottom, height, segments),
      surface,
      position,
    );
  }

  function sphere(
    owner: THREE.Object3D,
    name: string,
    radius: number,
    position: Point,
    surface: THREE.Material,
  ) {
    return mesh(
      owner,
      name,
      new THREE.SphereGeometry(radius, 16, 12),
      surface,
      position,
    );
  }

  function rod(
    owner: THREE.Object3D,
    name: string,
    from: Point,
    to: Point,
    radius: number,
    surface: THREE.Material,
  ) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const part = cylinder(
      owner,
      name,
      radius,
      radius,
      a.distanceTo(b),
      [0, 0, 0],
      surface,
      12,
    );
    part.position.copy(a).add(b).multiplyScalar(0.5);
    part.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.sub(a).normalize(),
    );
    return part;
  }

  // The same soft chalk edge as the other islands, with room all round the stalls.
  const outline = new THREE.Shape();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const organic = 1 + 0.009 * Math.sin(a * 5) + 0.006 * Math.cos(a * 7);
    const x = Math.cos(a) * 3.58 * organic;
    const z = Math.sin(a) * 2.78 * organic;
    if (i === 0) outline.moveTo(x, z);
    else outline.lineTo(x, z);
  }
  const base = new THREE.ExtrudeGeometry(outline, {
    depth: 0.51,
    bevelEnabled: true,
    bevelThickness: 0.13,
    bevelSize: 0.12,
    bevelSegments: 4,
    steps: 1,
  });
  base.rotateX(-Math.PI / 2);
  mesh(object, "food-island-stratum", base, material("#e5decb"), [0, -0.62, 0]);
  const top = new THREE.ExtrudeGeometry(outline, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.12,
    bevelSegments: 4,
    steps: 1,
  });
  top.rotateX(-Math.PI / 2);
  mesh(object, "food-island-surface", top, material("#eee8d9"), [0, -0.15, 0]);

  // Flush, irregular paving leads off the bridge and around the shared table.
  // It leaves the approach clear of furniture and avoids covering the friends' feet.
  const paving: [number, number, number, number, number][] = [
    [0, -2.2, 0.91, 0.4, -0.025],
    [-0.035, -1.6, 0.9, 0.28, 0.025],
    [0.025, -1.22, 0.91, 0.4, -0.02],
    [0, -0.73, 0.89, 0.4, 0.025],
    [0.43, -0.18, 0.42, 0.39, -0.07],
    [0.77, 0.23, 0.43, 0.39, 0.12],
    [1.2, 0.64, 0.4, 0.38, -0.08],
    [1.21, 1.08, 0.42, 0.3, 0.06],
    [-1.93, 0.26, 0.35, 0.32, -0.05],
    [-1.96, 0.66, 0.34, 0.33, 0.08],
    [-1.94, 1.11, 0.33, 0.37, -0.1],
    [-1.76, 1.64, 0.4, 0.28, 0.1],
    [-1.29, 1.76, 0.41, 0.3, -0.04],
    [-0.77, 1.87, 0.4, 0.3, 0.025],
  ];
  for (const [x, z, width, depth, turn] of paving) {
    const paver = box(
      object,
      "food-court-paving",
      [width, 0.018, depth],
      [x, z === -2.2 ? 0.024 : 0.028, z],
      sand,
      0.035,
    );
    paver.rotation.y = turn;
  }

  function lettering(
    owner: THREE.Object3D,
    text: string,
    subtitle: string,
    foreground: string,
    position: Point,
    width: number,
    height: number,
  ) {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f3ead7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = foreground;
    ctx.font = "900 116px sans-serif";
    ctx.fillText(text, 384, 100);
    ctx.font = "600 30px monospace";
    ctx.fillText(subtitle, 384, 187);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const face = mesh(
      owner,
      "food-stall-lettering",
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.9,
        emissive: "#ffd59c",
        emissiveMap: texture,
        emissiveIntensity: 0,
      }),
      position,
    );
    face.castShadow = false;
    nightSurfaces.push({
      material: face.material as THREE.MeshStandardMaterial,
      strength: 0.27,
    });
  }

  function stall(
    name: string,
    subtitle: string,
    position: Point,
    turn: number,
    accent: THREE.MeshStandardMaterial,
    alternate: THREE.MeshStandardMaterial,
    textColor: string,
  ) {
    const shop = new THREE.Group();
    shop.name = `food-stall-${name.toLowerCase()}`;
    shop.position.set(...position);
    shop.rotation.y = turn;
    object.add(shop);

    // Separate wood planks and rounded posts keep the stands handcrafted.
    for (let i = 0; i < 8; i++) {
      box(
        shop,
        "food-stall-terrace-plank",
        [0.202, 0.064, 1.18],
        [-0.735 + i * 0.21, 0.052, 0],
        i % 3 === 0 ? woodLight : wood,
        0.012,
      );
    }
    const roofHeight = 2.148;
    const roofTilt = 0.155;
    for (const x of [-0.68, 0.68]) {
      for (const z of [-0.42, 0.42]) {
        const postTop =
          roofHeight -
          Math.tan(roofTilt) * (z + 0.1) -
          0.029 / Math.cos(roofTilt);
        cylinder(
          shop,
          "food-stall-post",
          0.045,
          0.05,
          postTop - 0.084,
          [x, (postTop + 0.084) / 2, z],
          wood,
        );
        cylinder(
          shop,
          "food-stall-post-foot",
          0.064,
          0.064,
          0.065,
          [x, 0.1165, z],
          gold,
        );
      }
      box(
        shop,
        "food-stall-side-panel",
        [0.056, 0.49, 0.79],
        [x, 0.399, 0],
        accent,
      );
      box(
        shop,
        "food-stall-side-sill",
        [0.09, 0.07, 0.84],
        [x, 0.119, 0],
        woodDark,
        0.012,
      );
    }
    box(
      shop,
      "food-stall-back-panel",
      [1.36, 0.54, 0.065],
      [0, 0.424, -0.42],
      alternate,
    );
    box(
      shop,
      "food-stall-back-sill",
      [1.36, 0.07, 0.09],
      [0, 0.119, -0.42],
      woodDark,
      0.012,
    );
    box(
      shop,
      "food-stall-counter-body",
      [1.35, 0.53, 0.36],
      [0, 0.419, 0.27],
      accent,
    );
    for (const x of [-0.55, 0.55]) {
      for (const z of [0.14, 0.4]) {
        box(
          shop,
          "food-stall-counter-foot",
          [0.1, 0.07, 0.09],
          [x, 0.119, z],
          woodDark,
          0.013,
        );
      }
    }
    for (const x of [-0.52, -0.26, 0, 0.26, 0.52]) {
      box(
        shop,
        "food-stall-counter-batten",
        [0.022, 0.45, 0.018],
        [x, 0.42, 0.458],
        alternate,
        0.005,
      );
    }
    box(
      shop,
      "food-stall-countertop",
      [1.5, 0.085, 0.55],
      [0, 0.7265, 0.27],
      cream,
      0.033,
    );
    // The two short shelves leave a real opening behind the cook's head.
    for (const x of [-0.47, 0.47]) {
      box(
        shop,
        "food-stall-back-shelf",
        [0.3, 0.055, 0.21],
        [x, 0.826, -0.335],
        woodLight,
      );
    }

    // A higher, shallower canopy keeps faces visible through the serving window.
    for (let i = 0; i < 8; i++) {
      const surface = i % 2 === 0 ? accent : alternate;
      const x = -0.735 + i * 0.21;
      const roof = box(
        shop,
        "food-stall-striped-awning",
        [0.214, 0.058, 1.02],
        [x, roofHeight, -0.1],
        surface,
        0.017,
      );
      roof.rotation.x = roofTilt;
      box(
        shop,
        "food-stall-scalloped-awning",
        [0.211, 0.19, 0.047],
        [x, 1.965, 0.42],
        surface,
        0.06,
      );
    }
    rod(
      shop,
      "food-stall-awning-front-bar",
      [-0.81, 2.008, 0.4],
      [0.81, 2.008, 0.4],
      0.032,
      woodDark,
    );
    rod(
      shop,
      "food-stall-awning-back-bar",
      [-0.81, 2.151, -0.51],
      [0.81, 2.151, -0.51],
      0.032,
      woodDark,
    );
    for (const x of [-0.48, 0.48]) {
      rod(
        shop,
        "food-stall-sign-hanger",
        [x, 2.018, 0.42],
        [x, 1.97, 0.445],
        0.011,
        gold,
      );
    }
    box(
      shop,
      "food-stall-signboard",
      [1.13, 0.28, 0.055],
      [0, 1.905, 0.462],
      woodDark,
    );
    box(
      shop,
      "food-stall-sign-inlay",
      [1.075, 0.233, 0.008],
      [0, 1.905, 0.494],
      cream,
      0.009,
    );
    lettering(shop, name, subtitle, textColor, [0, 1.905, 0.499], 1.02, 0.216);

    return shop;
  }

  const momos = stall(
    "MOMOS",
    "FRESHLY STEAMED",
    [-1.9, 0, -0.95],
    0,
    coral,
    cream,
    "#b35c4b",
  );
  const chai = stall(
    "CHAI",
    "ONE MORE CUP",
    [1.75, 0, -1.1],
    0,
    saffron,
    cream,
    "#8a5732",
  );
  const noodles = stall(
    "NOODLES",
    "HOT OFF THE WOK",
    [2.22, 0, 0.85],
    -Math.PI / 2,
    cobalt,
    mint,
    "#485dca",
  );

  // Open bamboo steamer, folded dumplings, dipping sauce, and a stacked spare basket.
  cylinder(
    momos,
    "food-momo-steamer-base",
    0.207,
    0.191,
    0.057,
    [-0.24, 0.7975, 0.28],
    woodLight,
  );
  const steamerRim = mesh(
    momos,
    "food-momo-steamer-rim",
    new THREE.TorusGeometry(0.19, 0.025, 8, 28),
    wood,
    [-0.24, 0.858, 0.28],
  );
  steamerRim.rotation.x = Math.PI / 2;
  cylinder(
    momos,
    "food-momo-steamer-liner",
    0.166,
    0.166,
    0.012,
    [-0.24, 0.832, 0.28],
    cream,
  );
  for (const [dx, dz] of [
    [-0.079, 0.034],
    [0.06, 0.051],
    [0.002, -0.076],
  ]) {
    const dumpling = sphere(
      momos,
      "food-momo-dumpling",
      0.065,
      [-0.24 + dx, 0.881, 0.28 + dz],
      porcelain,
    );
    dumpling.scale.set(1, 0.78, 0.82);
    for (let seam = -1; seam <= 1; seam++) {
      rod(
        momos,
        "food-momo-pleat",
        [-0.266 + dx, 0.914, 0.28 + dz + seam * 0.016],
        [-0.23 + dx, 0.925, 0.28 + dz + seam * 0.011],
        0.005,
        sand,
      );
    }
  }
  cylinder(
    momos,
    "food-momo-sauce-bowl",
    0.075,
    0.05,
    0.042,
    [0.135, 0.79, 0.405],
    porcelain,
  );
  cylinder(
    momos,
    "food-momo-chilli-sauce",
    0.06,
    0.06,
    0.006,
    [0.135, 0.814, 0.405],
    red,
  );
  for (let i = 0; i < 2; i++) {
    cylinder(
      momos,
      "food-momo-stacked-steamer",
      0.13,
      0.13,
      0.082,
      [0.43, 0.811 + i * 0.085, 0.11],
      woodLight,
    );
    const rim = mesh(
      momos,
      "food-momo-basket-band",
      new THREE.TorusGeometry(0.126, 0.012, 6, 20),
      wood,
      [0.43, 0.851 + i * 0.085, 0.11],
    );
    rim.rotation.x = Math.PI / 2;
  }
  box(
    momos,
    "food-momo-steamer-lid-grip",
    [0.055, 0.034, 0.032],
    [0.43, 0.952, 0.11],
    woodDark,
    0.011,
  );

  // A plump steel chai kettle with its spout, open cups and a biscuit jar.
  const kettle = sphere(
    chai,
    "food-chai-kettle-body",
    0.158,
    [-0.24, 0.911, 0.27],
    steel,
  );
  kettle.scale.y = 0.85;
  cylinder(
    chai,
    "food-chai-kettle-foot",
    0.104,
    0.104,
    0.034,
    [-0.24, 0.786, 0.27],
    ink,
  );
  cylinder(
    chai,
    "food-chai-kettle-lid",
    0.108,
    0.115,
    0.028,
    [-0.24, 1.04, 0.27],
    steel,
  );
  sphere(
    chai,
    "food-chai-kettle-lid-knob",
    0.032,
    [-0.24, 1.072, 0.27],
    woodDark,
  );
  rod(
    chai,
    "food-chai-kettle-spout",
    [-0.37, 0.923, 0.27],
    [-0.485, 1.008, 0.27],
    0.04,
    steel,
  );
  const handle = mesh(
    chai,
    "food-chai-kettle-handle",
    new THREE.TorusGeometry(0.135, 0.02, 8, 24, Math.PI),
    woodDark,
    [-0.24, 1.034, 0.27],
  );
  handle.rotation.y = Math.PI / 2;
  for (const [x, z] of [
    [0.025, 0.34],
    [0.195, 0.34],
    [0.11, 0.14],
  ]) {
    cylinder(
      chai,
      "food-chai-clay-cup",
      0.054,
      0.036,
      0.078,
      [x, 0.808, z],
      coralDark,
    );
    cylinder(chai, "food-chai-tea", 0.044, 0.044, 0.006, [x, 0.849, z], tea);
  }
  cylinder(
    chai,
    "food-chai-biscuit-jar",
    0.084,
    0.076,
    0.205,
    [0.45, 0.8715, 0.19],
    cream,
  );
  cylinder(
    chai,
    "food-chai-biscuit-jar-lid",
    0.09,
    0.09,
    0.027,
    [0.45, 0.9875, 0.19],
    saffron,
  );
  for (const x of [-0.52, -0.39, 0.39, 0.52]) {
    cylinder(
      chai,
      "food-chai-shelf-tin",
      0.06,
      0.06,
      0.12,
      [x, 0.9135, -0.335],
      x < 0 ? saffron : mint,
    );
    cylinder(
      chai,
      "food-chai-shelf-tin-lid",
      0.061,
      0.061,
      0.014,
      [x, 0.9805, -0.335],
      cream,
    );
  }

  // Noodle bowls have real pale coils, vegetable pieces and neatly resting chopsticks.
  const noodleCurve = new THREE.CatmullRomCurve3(
    Array.from({ length: 35 }, (_, i) => {
      const t = i / 34;
      const a = t * Math.PI * 5;
      const r = 0.068 * (1 - t * 0.7);
      return new THREE.Vector3(
        Math.cos(a) * r,
        0.004 * Math.sin(a * 2),
        Math.sin(a) * r,
      );
    }),
  );
  const noodleGeometry = new THREE.TubeGeometry(
    noodleCurve,
    36,
    0.009,
    5,
    false,
  );
  for (const [x, z] of [
    [-0.36, 0.28],
    [0.015, 0.31],
  ]) {
    cylinder(
      noodles,
      "food-noodle-bowl",
      0.123,
      0.069,
      0.1,
      [x, 0.819, z],
      porcelain,
    );
    cylinder(
      noodles,
      "food-noodle-broth",
      0.108,
      0.108,
      0.009,
      [x, 0.871, z],
      tea,
    );
    mesh(noodles, "food-noodle-coil", noodleGeometry, cream, [x, 0.883, z]);
    for (const side of [-1, 1]) {
      box(
        noodles,
        "food-noodle-spring-onion",
        [0.032, 0.017, 0.017],
        [x + side * 0.052, 0.889, z + 0.024],
        green,
        0.003,
      );
      rod(
        noodles,
        "food-noodle-chopstick",
        [x - 0.075, 0.892, z - 0.064 + side * 0.011],
        [x + 0.125, 0.92, z + 0.052 + side * 0.011],
        0.008,
        wood,
      );
    }
  }
  cylinder(
    noodles,
    "food-noodle-chopstick-pot",
    0.063,
    0.053,
    0.12,
    [0.395, 0.829, 0.16],
    coral,
  );
  for (let i = 0; i < 5; i++) {
    rod(
      noodles,
      "food-noodle-spare-chopstick",
      [0.38 + i * 0.008, 0.86, 0.16],
      [0.361 + i * 0.017, 1.02 + (i % 2) * 0.025, 0.16],
      0.007,
      woodLight,
    );
  }
  for (const x of [-0.47, 0.47]) {
    cylinder(
      noodles,
      "food-noodle-shelf-bowl",
      0.088,
      0.047,
      0.065,
      [x, 0.886, -0.335],
      x < 0 ? cream : mint,
    );
  }

  // One cook per stall, grounded on the terrace with hands above the counter.
  function vendor(
    owner: THREE.Object3D,
    x: number,
    apron: THREE.Material,
    look: number,
  ) {
    const person = new THREE.Group();
    person.name = "food-stall-vendor";
    person.position.set(x, 0.084, -0.15);
    owner.add(person);
    for (const side of [-1, 1]) {
      box(
        person,
        "food-vendor-shoe",
        [0.105, 0.07, 0.145],
        [side * 0.079, 0.035, 0.012],
        ink,
        0.027,
      );
      box(
        person,
        "food-vendor-leg",
        [0.075, 0.4, 0.083],
        [side * 0.079, 0.25, -0.011],
        cream,
      );
    }
    box(
      person,
      "food-vendor-apron",
      [0.3, 0.34, 0.2],
      [0, 0.568, -0.01],
      apron,
      0.07,
    );
    const head = new THREE.Group();
    head.name = "food-vendor-face";
    head.position.set(0, 0.895, 0.009);
    head.rotation.y = look;
    person.add(head);
    box(
      head,
      "food-vendor-head",
      [0.345, 0.315, 0.315],
      [0, 0, 0],
      cream,
      0.075,
    );
    box(
      head,
      "food-vendor-hat-band",
      [0.352, 0.085, 0.332],
      [0, 0.135, 0],
      porcelain,
    );
    box(
      head,
      "food-vendor-hat",
      [0.374, 0.115, 0.35],
      [0, 0.201, 0],
      porcelain,
      0.06,
    );
    for (const side of [-1, 1]) {
      sphere(head, "food-vendor-eye", 0.018, [side * 0.068, 0.018, 0.16], ink);
      rod(
        person,
        "food-vendor-arm",
        [side * 0.178, 0.663, 0.015],
        [side * 0.224, 0.78, 0.155],
        0.044,
        apron,
      );
      sphere(
        person,
        "food-vendor-hand",
        0.043,
        [side * 0.224, 0.78, 0.155],
        cream,
      );
    }
    const smile = mesh(
      head,
      "food-vendor-smile",
      new THREE.TorusGeometry(0.032, 0.008, 6, 12, Math.PI),
      ink,
      [0, -0.041, 0.163],
    );
    smile.rotation.z = Math.PI;
  }
  vendor(momos, 0.12, coralDark, -0.5);
  vendor(chai, 0.11, saffron, -0.5);
  vendor(noodles, 0.08, cobalt, 0.25);

  function herbPot(x: number, z: number, scale: number) {
    const pot = new THREE.Group();
    pot.name = "food-court-herb-pot";
    pot.position.set(x, 0.02, z);
    pot.scale.setScalar(scale);
    object.add(pot);
    cylinder(
      pot,
      "food-herb-pot-base",
      0.19,
      0.135,
      0.235,
      [0, 0.1175, 0],
      coral,
    );
    cylinder(
      pot,
      "food-herb-pot-rim",
      0.207,
      0.207,
      0.05,
      [0, 0.222, 0],
      coralDark,
    );
    cylinder(
      pot,
      "food-herb-pot-soil",
      0.179,
      0.179,
      0.009,
      [0, 0.246, 0],
      woodDark,
    );
    for (const [dx, dy, dz, size] of [
      [-0.095, 0.335, 0.024, 0.155],
      [0.09, 0.33, 0.035, 0.15],
      [0, 0.426, -0.043, 0.17],
    ]) {
      const foliage = sphere(
        pot,
        "food-herb-leaf-cluster",
        size,
        [dx, dy, dz],
        dy > 0.4 ? leaf : green,
      );
      foliage.scale.set(0.8, 1.08, 0.85);
    }
  }
  herbPot(-2.94, 0.31, 0.93);
  herbPot(-1.55, 2.13, 0.84);

  const warmBulb = new THREE.MeshStandardMaterial({
    color: "#fff0c9",
    roughness: 0.4,
    emissive: "#ffd797",
    emissiveIntensity: 0,
  });
  nightSurfaces.push({ material: warmBulb, strength: 2.5 });
  const lanternMaterials = ["#ef9476", "#edc361", "#a3c6b3"].map((color) => {
    const surface = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.86,
      emissive: color,
      emissiveIntensity: 0,
    });
    nightSurfaces.push({ material: surface, strength: 0.7 });
    return surface;
  });
  const postTops: Point[] = [
    [-2.7, 2.9, -1],
    [1.3, 3.05, -2.05],
    [3.05, 2.85, 0.5],
    [-2.55, 2.8, 1.45],
  ];
  for (const [x, y, z] of postTops) {
    cylinder(
      object,
      "food-festival-post-foot",
      0.112,
      0.13,
      0.085,
      [x, 0.0625, z],
      sand,
    );
    rod(
      object,
      "food-festival-wood-post",
      [x, 0.105, z],
      [x, y + 0.035, z],
      0.042,
      woodDark,
    );
    sphere(object, "food-festival-post-finial", 0.073, [x, y + 0.084, z], gold);
  }

  // All cables terminate on posts; lanterns hang below them on short real cords.
  function lightString(
    from: Point,
    to: Point,
    sag: number,
    count: number,
    offset: number,
  ) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const midpoint = a.clone().add(b).multiplyScalar(0.5);
    midpoint.y -= sag * 2;
    const curve = new THREE.QuadraticBezierCurve3(a, midpoint, b);
    mesh(
      object,
      "food-festival-light-cable",
      new THREE.TubeGeometry(curve, 36, 0.012, 6, false),
      ink,
      [0, 0, 0],
    );
    for (let i = 1; i < count; i++) {
      const p = curve.getPoint(i / count);
      if ((i + offset) % 3 === 0) {
        rod(
          object,
          "food-paper-lantern-cord",
          [p.x, p.y, p.z],
          [p.x, p.y - 0.1, p.z],
          0.008,
          ink,
        );
        const lantern = sphere(
          object,
          "food-paper-lantern",
          0.147,
          [p.x, p.y - 0.261, p.z],
          lanternMaterials[(Math.floor(i / 3) + offset) % 3],
        );
        lantern.scale.set(1, 1.1, 1);
        for (const sign of [-1, 1]) {
          cylinder(
            object,
            "food-paper-lantern-cap",
            0.057,
            0.057,
            0.032,
            [p.x, p.y - 0.261 + sign * 0.148, p.z],
            woodDark,
          );
        }
        for (const band of [-0.082, 0, 0.082]) {
          const radius = Math.sqrt(
            Math.max(0.001, 0.147 ** 2 - (band / 1.1) ** 2),
          );
          const ring = mesh(
            object,
            "food-paper-lantern-rib",
            new THREE.TorusGeometry(radius, 0.004, 5, 24),
            cream,
            [p.x, p.y - 0.261 + band, p.z],
          );
          ring.rotation.x = Math.PI / 2;
        }
        bulbPositions.push([p.x, p.y - 0.261, p.z]);
      } else {
        cylinder(
          object,
          "food-festival-bulb-socket",
          0.024,
          0.024,
          0.043,
          [p.x, p.y - 0.027, p.z],
          gold,
          12,
        );
        sphere(
          object,
          "food-festival-bulb",
          0.041,
          [p.x, p.y - 0.072, p.z],
          warmBulb,
        );
        bulbPositions.push([p.x, p.y - 0.072, p.z]);
      }
    }
  }
  lightString(postTops[0], postTops[1], 0.24, 10, 0);
  lightString(postTops[1], postTops[2], 0.17, 7, 1);
  lightString(postTops[2], postTops[3], 0.23, 12, 2);
  lightPositions.push(
    [-1.86, 1.52, -0.4],
    [1.72, 1.52, -0.6],
    [2.02, 1.45, 0.85],
    [-0.8, 1.9, 0.7],
  );

  const labelPosition: Point = [-0.7, 0.27, 2.44];
  return {
    object,
    nightSurfaces,
    bulbPositions,
    lightPositions,
    labelPosition,
  };
}
