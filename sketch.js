// コーラすごろく / Web移植 Step 2
// 目的:データと静止画面を移植し、3つのゾーンをブラウザ上で確認する。
// この段階では王冠・コマ・材料はまだ操作できません。

let CONFIG;
let TEXT;
let INGREDIENTS;
let EVENT_DIE;
let RESULT_WORDS;
let BOARD_NODES;
let gameState;
let layout;
let lastLayoutWidth = 0;
let lastLayoutHeight = 0;

function setup() {
  rectMode(CORNER);
  ellipseMode(CENTER);
  textAlign(CENTER);

  initGameData();
  initGameState();
  updateLayout(true);
}

function resized() {
  updateLayout(true);
}

function draw() {
  updateLayout(false);
  background(25, 20, 20);

  if (gameState.phase === "TITLE") {
    drawTitle();
    return;
  }

  drawPreviewScreen();
}

function touched(touch) {
  if (touch.state !== ENDED) return;

  if (touch.x > WIDTH - 82 && touch.y > HEIGHT - 58) {
    gameState.language = gameState.language === "ja" ? "en" : "ja";
    return;
  }

  if (gameState.phase === "TITLE") {
    gameState.phase = "PREVIEW";
  }
}

function initGameData() {
  CONFIG = {
    debugText: false,

    mapWidth: WIDTH * 1.5,
    mapHeight: HEIGHT * 4.5,

    cameraZoom: 1.0,
    cameraLookAheadY: 80,

    nodeSize: 14,
    currentNodeSize: 26,

    glassCapacity: 5,
    pressureMax: 5,

    capSize: 30,
  };

  TEXT = {
    ja: {
      title: "コーラすごろく",
      langButton: "EN",
    },
    en: {
      title: "COLA ROLL",
      langButton: "JP",
    },
  };

  INGREDIENTS = {
    base_syrup: {
      id: "base_syrup",
      ja: "基本シロップ",
      en: "Base Syrup",
      color: color(180, 100, 20),
      sweetness: 1,
      spice: 0,
      chill: 0,
      strange: 0,
    },

    thick_syrup: {
      id: "thick_syrup",
      ja: "濃いシロップ",
      en: "Thick Syrup",
      color: color(120, 60, 10),
      sweetness: 2,
      spice: 0,
      chill: 0,
      strange: 0,
    },

    vanilla: {
      id: "vanilla",
      ja: "バニラ",
      en: "Vanilla",
      color: color(255, 250, 200),
      sweetness: 1,
      spice: 0,
      chill: 0,
      strange: 0,
    },

    caramel: {
      id: "caramel",
      ja: "キャラメル",
      en: "Caramel",
      color: color(150, 80, 0),
      sweetness: 2,
      spice: 0,
      chill: 0,
      strange: 0,
    },

    ginger: {
      id: "ginger",
      ja: "生姜",
      en: "Ginger",
      color: color(200, 180, 80),
      sweetness: 0,
      spice: 1,
      chill: 0,
      strange: 0,
    },

    cinnamon: {
      id: "cinnamon",
      ja: "シナモン",
      en: "Cinnamon",
      color: color(160, 70, 30),
      sweetness: 0,
      spice: 1,
      chill: 0,
      strange: 0,
    },

    lemon_peel: {
      id: "lemon_peel",
      ja: "レモンピール",
      en: "Lemon Peel",
      color: color(220, 220, 50),
      sweetness: 0,
      spice: 1,
      chill: 0,
      strange: 0,
    },

    ice: {
      id: "ice",
      ja: "氷",
      en: "Ice",
      color: color(200, 240, 255, 210),
      sweetness: 0,
      spice: 0,
      chill: 1,
      strange: 0,
    },

    herb: {
      id: "herb",
      ja: "薬草",
      en: "Herb",
      color: color(50, 100, 50),
      sweetness: 0,
      spice: 1,
      chill: 0,
      strange: 1,
    },

    brown_sugar: {
      id: "brown_sugar",
      ja: "黒糖",
      en: "Brown Sugar",
      color: color(80, 50, 20),
      sweetness: 2,
      spice: 0,
      chill: 0,
      strange: 1,
    },

    secret_syrup: {
      id: "secret_syrup",
      ja: "秘伝シロップ",
      en: "Secret Syrup",
      color: color(50, 20, 60),
      sweetness: 1,
      spice: 1,
      chill: 0,
      strange: 2,
    },
  };

  EVENT_DIE = [
    { id: "flip" },
    { id: "flip" },
    { id: "swap" },
    { id: "swap" },
    { id: "spill" },
    { id: "spill" },
  ];

  RESULT_WORDS = {
    ja: {
      topFlavor: {
        base_syrup: "素朴なシロップの",
        thick_syrup: "コクのある",
        vanilla: "バニラ香る",
        caramel: "キャラメル風味の",
        ginger: "生姜香る",
        cinnamon: "シナモン香る",
        lemon_peel: "レモン香る",
        ice: "冷え冷えの",
        herb: "薬草香る",
        brown_sugar: "黒糖香る",
        secret_syrup: "秘伝の香り漂う",
      },
    },

    en: {
      topFlavor: {
        base_syrup: "Simple Syrup",
        thick_syrup: "Rich",
        vanilla: "Vanilla",
        caramel: "Caramel",
        ginger: "Ginger",
        cinnamon: "Cinnamon",
        lemon_peel: "Lemon",
        ice: "Ice-Cold",
        herb: "Herbal",
        brown_sugar: "Brown Sugar",
        secret_syrup: "Secret Syrup",
      },
    },
  };

  BOARD_NODES = {
    start: {
      id: "start",
      nx: 0.25,
      ny: 0.05,
      next: "base_syrup",
      effect: {},
    },

    base_syrup: {
      id: "base_syrup",
      nx: 0.25,
      ny: 0.10,
      next: "pour_carbon",
      effect: {
        addIngredient: "base_syrup",
      },
    },

    pour_carbon: {
      id: "pour_carbon",
      nx: 0.25,
      ny: 0.15,
      next: "ice1",
      effect: {
        pressureDelta: 1,
      },
    },

    ice1: {
      id: "ice1",
      nx: 0.25,
      ny: 0.20,
      next: "vanilla1",
      effect: {
        addIngredient: "ice",
      },
    },

    vanilla1: {
      id: "vanilla1",
      nx: 0.25,
      ny: 0.25,
      next: "stir1",
      effect: {
        addIngredient: "vanilla",
      },
    },

    stir1: {
      id: "stir1",
      nx: 0.25,
      ny: 0.30,
      next: "syrup2",
      effect: {},
      nodeType: "event_gate",
      eventId: "stir1",
    },

    syrup2: {
      id: "syrup2",
      nx: 0.25,
      ny: 0.35,
      next: "branch1",
      effect: {
        addIngredient: "base_syrup",
      },
    },

    branch1: {
      id: "branch1",
      nx: 0.25,
      ny: 0.40,
      effect: {},
      choices: [
        {
          id: "sweet",
          next: "sweet_vanilla",
        },
        {
          id: "spice",
          next: "spice_ginger",
        },
      ],
    },

    sweet_vanilla: {
      id: "sweet_vanilla",
      routeId: "sweet",
      nx: 0.10,
      ny: 0.45,
      next: "sweet_caramel",
      effect: {
        addIngredient: "vanilla",
      },
    },

    sweet_caramel: {
      id: "sweet_caramel",
      routeId: "sweet",
      nx: 0.10,
      ny: 0.50,
      next: "sweet_stir",
      effect: {
        addIngredient: "caramel",
      },
    },

    sweet_stir: {
      id: "sweet_stir",
      routeId: "sweet",
      nx: 0.10,
      ny: 0.55,
      next: "sweet_sugar",
      effect: {},
      nodeType: "event_gate",
      eventId: "stir_sweet",
    },

    sweet_sugar: {
      id: "sweet_sugar",
      routeId: "sweet",
      nx: 0.10,
      ny: 0.60,
      next: "sweet_strong",
      effect: {
        addIngredient: "brown_sugar",
      },
    },

    sweet_strong: {
      id: "sweet_strong",
      routeId: "sweet",
      nx: 0.10,
      ny: 0.65,
      next: "merge1",
      effect: {
        addIngredient: "thick_syrup",
      },
    },

    spice_ginger: {
      id: "spice_ginger",
      routeId: "spice",
      nx: 0.40,
      ny: 0.45,
      next: "spice_cinnamon",
      effect: {
        addIngredient: "ginger",
      },
    },

    spice_cinnamon: {
      id: "spice_cinnamon",
      routeId: "spice",
      nx: 0.40,
      ny: 0.50,
      next: "spice_stir",
      effect: {
        addIngredient: "cinnamon",
      },
    },

    spice_stir: {
      id: "spice_stir",
      routeId: "spice",
      nx: 0.40,
      ny: 0.55,
      next: "spice_herb",
      effect: {},
      nodeType: "event_gate",
      eventId: "stir_spice",
    },

    spice_herb: {
      id: "spice_herb",
      routeId: "spice",
      nx: 0.40,
      ny: 0.60,
      next: "spice_lemon",
      effect: {
        addIngredient: "herb",
      },
    },

    spice_lemon: {
      id: "spice_lemon",
      routeId: "spice",
      nx: 0.40,
      ny: 0.65,
      next: "merge1",
      effect: {
        addIngredient: "lemon_peel",
      },
    },

    merge1: {
      id: "merge1",
      nx: 0.25,
      ny: 0.70,
      next: "carb2",
      effect: {
        addIngredient: "base_syrup",
      },
    },

    carb2: {
      id: "carb2",
      nx: 0.25,
      ny: 0.75,
      next: "mystery",
      effect: {
        pressureDelta: 1,
      },
    },

    mystery: {
      id: "mystery",
      nx: 0.25,
      ny: 0.80,
      next: "ice2",
      effect: {
        addMystery: true,
      },
    },

    ice2: {
      id: "ice2",
      nx: 0.25,
      ny: 0.85,
      next: "stir2",
      effect: {
        addIngredient: "ice",
      },
    },

    stir2: {
      id: "stir2",
      nx: 0.25,
      ny: 0.90,
      next: "branch2",
      effect: {},
      nodeType: "event_gate",
      eventId: "stir_common",
    },

    branch2: {
      id: "branch2",
      nx: 0.25,
      ny: 0.95,
      effect: {},
      choices: [
        {
          id: "safe",
          next: "safe_lemon",
        },
        {
          id: "risky",
          next: "risk_fizz",
        },
      ],
    },

    safe_lemon: {
      id: "safe_lemon",
      routeId: "safe",
      nx: 0.10,
      ny: 1.00,
      next: "safe_base_syrup",
      effect: {
        pressureDelta: -1,
        garnish: "lemon",
      },
    },

    safe_base_syrup: {
      id: "safe_base_syrup",
      routeId: "safe",
      nx: 0.10,
      ny: 1.05,
      next: "safe_cherry",
      effect: {
        addIngredient: "base_syrup",
      },
    },

    safe_cherry: {
      id: "safe_cherry",
      routeId: "safe",
      nx: 0.10,
      ny: 1.10,
      next: "goal",
      effect: {
        pressureDelta: -1,
        garnish: "cherry",
      },
    },

    risk_fizz: {
      id: "risk_fizz",
      routeId: "risky",
      nx: 0.40,
      ny: 1.00,
      next: "risk_stir",
      effect: {
        pressureDelta: 1,
      },
    },

    risk_stir: {
      id: "risk_stir",
      routeId: "risky",
      nx: 0.40,
      ny: 1.05,
      next: "risk_mystery",
      effect: {},
      nodeType: "event_gate",
      eventId: "stir_risky",
    },

    risk_mystery: {
      id: "risk_mystery",
      routeId: "risky",
      nx: 0.40,
      ny: 1.10,
      next: "risk_mix",
      effect: {
        addMystery: true,
      },
    },

    risk_mix: {
      id: "risk_mix",
      routeId: "risky",
      nx: 0.40,
      ny: 1.15,
      next: "goal",
      effect: {},
      nodeType: "event_gate",
      eventId: "risk_mix",
    },

    goal: {
      id: "goal",
      nx: 0.25,
      ny: 1.20,
      next: null,
      effect: {},
    },
  };
}

function initGameState() {
  gameState = {
    phase: "TITLE",
    language: "ja",
    currentNodeId: "start",
    selectedRoutes: {},

    glass: {
      slots: [
        {
          ingredientId: "base_syrup",
        },
        {
          ingredientId: "ice",
        },
        {
          ingredientId: "vanilla",
        },
      ],
      pressure: 2,
      garnish: null,
      spilledTokens: [],
    },

    camera: {
      x: 0,
      y: 0,
      zoom: 1,
    },
  };
}

function updateLayout(force) {
  if (
    !force &&
    WIDTH === lastLayoutWidth &&
    HEIGHT === lastLayoutHeight
  ) {
    return;
  }

  lastLayoutWidth = WIDTH;
  lastLayoutHeight = HEIGHT;

  const portrait = HEIGHT > WIDTH;

  if (portrait) {
    const margin = 12;
    const lowerH = HEIGHT * 0.38;
    const capW = (WIDTH - margin * 3) * 0.60;

    layout = {
      board: {
        x: margin,
        y: lowerH + margin * 2,
        w: WIDTH - margin * 2,
        h: HEIGHT - lowerH - margin * 3,
      },

      cap: {
        x: margin,
        y: margin,
        w: capW,
        h: lowerH,
      },

      glass: {
        x: margin * 2 + capW,
        y: margin,
        w: WIDTH - capW - margin * 3,
        h: lowerH,
      },
    };
  } else {
    layout = {
      board: {
        x: 20,
        y: HEIGHT * 0.35 + 10,
        w: WIDTH * 0.60,
        h: HEIGHT * 0.65 - 30,
      },

      cap: {
        x: 20,
        y: 20,
        w: WIDTH * 0.60,
        h: HEIGHT * 0.35 - 20,
      },

      glass: {
        x: WIDTH * 0.60 + 40,
        y: 20,
        w: WIDTH * 0.40 - 60,
        h: HEIGHT - 40,
      },
    };
  }

  CONFIG.mapWidth = WIDTH * 1.5;
  CONFIG.mapHeight = HEIGHT * 4.5;

  const start = BOARD_NODES[gameState.currentNodeId];

  gameState.camera.x = start.nx * CONFIG.mapWidth;
  gameState.camera.y =
    start.ny * CONFIG.mapHeight +
    CONFIG.cameraLookAheadY;

  gameState.camera.zoom = portrait ? 0.86 : 1.0;
}

function drawTitle() {
  drawLanguageButton();

  fill(245, 238, 228);
  noStroke();

  fontSize(Math.min(42, WIDTH * 0.095));
  textAlign(CENTER);

  text(
    TEXT[gameState.language].title,
    WIDTH / 2,
    HEIGHT * 0.60,
  );

  const cx = WIDTH / 2;
  const cy = HEIGHT * 0.39;

  const bob =
    Math.sin(ElapsedTime * 3) *
    8;

  const rot =
    Math.sin(ElapsedTime * 2) *
    12;

  noFill();
  stroke(220, 205, 190, 70);
  strokeWidth(2);

  ellipse(
    cx,
    cy + bob,
    64 + Math.sin(ElapsedTime * 4) * 8,
  );

  noStroke();

  drawCap(
    cx,
    cy + bob,
    rot,
    34,
  );
}

function drawPreviewScreen() {
  drawBoardPanel();
  drawCapPanel();
  drawGlassPanel();
  drawLanguageButton();
}

function drawLanguageButton() {
  fill(220, 214, 205, 190);
  noStroke();

  fontSize(14);
  textAlign(RIGHT);

  text(
    TEXT[gameState.language].langButton,
    WIDTH - 24,
    HEIGHT - 28,
  );
}

function drawPanelFrame(panel) {
  noStroke();

  fill(10, 8, 8, 80);

  rect(
    panel.x + 5,
    panel.y - 5,
    panel.w,
    panel.h,
    16,
  );

  fill(40, 34, 34);

  rect(
    panel.x,
    panel.y,
    panel.w,
    panel.h,
    16,
  );

  noFill();
  stroke(108, 85, 78, 210);
  strokeWidth(2);

  rect(
    panel.x,
    panel.y,
    panel.w,
    panel.h,
    16,
  );

  noStroke();
}

function drawBoardPanel() {
  const panel = layout.board;

  drawPanelFrame(panel);

  clip(
    panel.x,
    panel.y,
    panel.w,
    panel.h,
  );

  pushMatrix();
  translate(panel.x, panel.y);

  const current =
    BOARD_NODES[gameState.currentNodeId];

  const cameraX =
    current.nx * CONFIG.mapWidth;

  const cameraY =
    current.ny * CONFIG.mapHeight +
    CONFIG.cameraLookAheadY;

  const centerX = panel.w * 0.50;
  const centerY = panel.h * 0.28;

  function worldToBoard(node) {
    const wx =
      node.nx * CONFIG.mapWidth;

    const wy =
      node.ny * CONFIG.mapHeight;

    return {
      x:
        (wx - cameraX) *
          gameState.camera.zoom +
        centerX,

      y:
        (wy - cameraY) *
          gameState.camera.zoom +
        centerY,
    };
  }

  for (const node of Object.values(BOARD_NODES)) {
    const p1 = worldToBoard(node);

    if (node.next) {
      const nextNode =
        BOARD_NODES[node.next];

      const p2 =
        worldToBoard(nextNode);

      if (
        segmentNearPanel(
          p1,
          p2,
          panel.w,
          panel.h,
        )
      ) {
        stroke(108, 103, 99, 210);
        strokeWidth(3);

        line(
          p1.x,
          p1.y,
          p2.x,
          p2.y,
        );
      }
    }

    if (node.choices) {
      for (const choice of node.choices) {
        const nextNode =
          BOARD_NODES[choice.next];

        const p2 =
          worldToBoard(nextNode);

        if (
          segmentNearPanel(
            p1,
            p2,
            panel.w,
            panel.h,
          )
        ) {
          stroke(108, 103, 99, 210);
          strokeWidth(3);

          line(
            p1.x,
            p1.y,
            p2.x,
            p2.y,
          );
        }
      }
    }
  }

  noStroke();

  for (const node of Object.values(BOARD_NODES)) {
    const p = worldToBoard(node);

    if (
      p.x < -25 ||
      p.x > panel.w + 25 ||
      p.y < -25 ||
      p.y > panel.h + 25
    ) {
      continue;
    }

    const isCurrent =
      node.id === gameState.currentNodeId;

    if (isCurrent) {
      fill(255, 105, 92);

      ellipse(
        p.x,
        p.y,
        CONFIG.currentNodeSize,
      );
    } else {
      fill(126, 117, 111);

      ellipse(
        p.x,
        p.y,
        CONFIG.nodeSize,
      );
    }

    drawNodeIcon(
      node,
      p.x,
      p.y,
      isCurrent ? 18 : 14,
      255,
    );
  }

  popMatrix();
  clip();
}

function segmentNearPanel(p1, p2, w, h) {
  const margin = 24;

  const p1Inside =
    p1.x > -margin &&
    p1.x < w + margin &&
    p1.y > -margin &&
    p1.y < h + margin;

  const p2Inside =
    p2.x > -margin &&
    p2.x < w + margin &&
    p2.y > -margin &&
    p2.y < h + margin;

  return p1Inside || p2Inside;
}

function drawNodeIcon(
  node,
  x,
  y,
  size,
  alpha,
) {
  if (node.id === "start") {
    noFill();
    stroke(245, 238, 228, alpha);
    strokeWidth(2);

    rectMode(CENTER);

    rect(
      x,
      y,
      size * 0.72,
      size,
      2,
    );

    rectMode(CORNER);
    noStroke();

    return;
  }

  if (node.id === "goal") {
    fill(240, 190, 90, alpha);

    ellipse(
      x,
      y,
      size,
    );

    return;
  }

  if (
    node.effect &&
    node.effect.addIngredient
  ) {
    drawIngredientIcon(
      node.effect.addIngredient,
      x,
      y,
      size,
      alpha,
    );

    return;
  }

  if (
    node.effect &&
    node.effect.addMystery
  ) {
    fill(220, 170, 220, alpha);

    fontSize(size * 1.15);
    textAlign(CENTER);

    text(
      "?",
      x,
      y,
    );

    return;
  }

  if (node.nodeType === "event_gate") {
    noFill();
    stroke(210, 215, 245, alpha);
    strokeWidth(2);

    pushMatrix();
    translate(x, y);
    rotate(ElapsedTime * 45);

    for (let i = 0; i < 10; i += 1) {
      const a1 = i * 42;
      const a2 = (i + 1) * 42;

      const r1 = i * 0.65;
      const r2 = (i + 1) * 0.65;

      line(
        Math.cos(a1 * Math.PI / 180) * r1,
        Math.sin(a1 * Math.PI / 180) * r1,
        Math.cos(a2 * Math.PI / 180) * r2,
        Math.sin(a2 * Math.PI / 180) * r2,
      );
    }

    popMatrix();
    noStroke();

    return;
  }

  if (
    node.effect &&
    node.effect.pressureDelta > 0
  ) {
    fill(180, 225, 245, alpha);

    ellipse(
      x - 4,
      y - 3,
      4,
    );

    ellipse(
      x + 3,
      y + 1,
      5,
    );

    ellipse(
      x,
      y + 5,
      3,
    );
  }
}

function drawCapPanel() {
  const panel = layout.cap;

  drawPanelFrame(panel);

  pushMatrix();
  translate(panel.x, panel.y);

  const laneX =
    panel.w * 0.50;

  const laneBottom =
    panel.h * 0.34;

  const laneTop =
    panel.h * 0.78;

  const zoneGap =
    (laneTop - laneBottom) / 2;

  const zoneW =
    Math.min(
      76,
      panel.w * 0.24,
    );

  const zoneH =
    Math.max(
      28,
      Math.min(
        42,
        panel.h * 0.17,
      ),
    );

  fill(230, 220, 210, 20);
  rectMode(CENTER);

  rect(
    laneX,
    (laneBottom + laneTop) / 2,
    zoneW + 18,
    laneTop - laneBottom + zoneH + 12,
    12,
  );

  for (let d = 1; d <= 3; d += 1) {
    const y =
      laneBottom +
      (d - 1) * zoneGap;

    fill(220, 210, 200, 48);

    rect(
      laneX,
      y,
      zoneW,
      zoneH,
      8,
    );

    fill(245, 238, 228, 210);

    fontSize(
      Math.min(
        20,
        zoneH * 0.62,
      ),
    );

    textAlign(CENTER);

    text(
      String(d),
      laneX,
      y,
    );
  }

  drawCap(
    laneX,
    panel.h * 0.17,
    0,
    Math.min(
      30,
      panel.h * 0.15,
    ),
  );

  const gaugeW =
    panel.w * 0.76;

  const gaugeH =
    Math.max(
      14,
      Math.min(
        20,
        panel.h * 0.08,
      ),
    );

  const gaugeX =
    panel.w * 0.12;

  const gaugeY =
    panel.h * 0.09;

  rectMode(CORNER);
  noStroke();

  fill(88, 80, 55);

  rect(
    gaugeX,
    gaugeY,
    gaugeW * 0.28,
    gaugeH,
    4,
  );

  fill(145, 96, 35);

  rect(
    gaugeX + gaugeW * 0.28,
    gaugeY,
    gaugeW * 0.34,
    gaugeH,
    0,
  );

  fill(180, 75, 25);

  rect(
    gaugeX + gaugeW * 0.62,
    gaugeY,
    gaugeW * 0.28,
    gaugeH,
    0,
  );

  fill(145, 35, 35);

  rect(
    gaugeX + gaugeW * 0.90,
    gaugeY,
    gaugeW * 0.10,
    gaugeH,
    4,
  );

  fill(245, 238, 228);
  rectMode(CENTER);

  rect(
    gaugeX + gaugeW * 0.50,
    gaugeY + gaugeH / 2,
    3,
    gaugeH + 8,
    2,
  );

  rectMode(CORNER);

  popMatrix();
}

function drawGlassPanel() {
  const panel = layout.glass;

  drawPanelFrame(panel);

  pushMatrix();
  translate(panel.x, panel.y);

  const scaleValue =
    Math.min(
      panel.w / 160,
      panel.h / 320,
      0.86,
    );

  const glassX =
    panel.w * 0.50;

  const glassY =
    panel.h * 0.47;

  drawGlass(
    glassX,
    glassY,
    scaleValue,
  );

  popMatrix();
}

function drawGlass(x, y, s) {
  pushMatrix();
  translate(x, y);
  scale(s);

  const slotH = 45;

  const glassH =
    slotH * CONFIG.glassCapacity + 10;

  const topW = 130;
  const bottomW = 100;

  stroke(245, 238, 228, 110);
  strokeWidth(4);

  line(
    -topW / 2,
    glassH / 2,
    -bottomW / 2,
    -glassH / 2,
  );

  line(
    topW / 2,
    glassH / 2,
    bottomW / 2,
    -glassH / 2,
  );

  line(
    -bottomW / 2,
    -glassH / 2,
    bottomW / 2,
    -glassH / 2,
  );

  stroke(245, 238, 228, 30);
  strokeWidth(2);

  for (
    let i = 1;
    i < CONFIG.glassCapacity;
    i += 1
  ) {
    const sy =
      -glassH / 2 +
      5 +
      i * slotH;

    const ratio =
      i / CONFIG.glassCapacity;

    const currentW =
      bottomW +
      (topW - bottomW) * ratio;

    line(
      -currentW / 2,
      sy,
      currentW / 2,
      sy,
    );
  }

  noStroke();

  fill(245, 238, 228, 12);
  rectMode(CENTER);

  rect(
    0,
    0,
    topW,
    glassH,
    8,
  );

  for (
    let i = 0;
    i < gameState.glass.slots.length;
    i += 1
  ) {
    const token =
      gameState.glass.slots[i];

    const sy =
      -glassH / 2 +
      5 +
      slotH / 2 +
      i * slotH;

    const ratio =
      (sy + glassH / 2) /
      glassH;

    const currentW =
      bottomW +
      (topW - bottomW) * ratio -
      10;

    const isTop =
      i === gameState.glass.slots.length - 1;

    if (isTop) {
      stroke(245, 238, 228, 210);
      strokeWidth(3);
    } else {
      noStroke();
    }

    fill(
      INGREDIENTS[token.ingredientId].color,
    );

    rectMode(CENTER);

    rect(
      0,
      sy,
      currentW,
      slotH - 4,
      4,
    );

    noStroke();

    drawIngredientIcon(
      token.ingredientId,
      0,
      sy,
      22,
      255,
    );

    if (isTop) {
      drawAromaLines(
        0,
        sy + 30,
      );
    }
  }

  const pressureY =
    -glassH / 2 - 20;

  for (
    let i = 1;
    i <= CONFIG.pressureMax;
    i += 1
  ) {
    if (i <= gameState.glass.pressure) {
      fill(120, 205, 235, 210);
    } else {
      fill(100, 95, 95, 80);
    }

    ellipse(
      -30 + i * 12,
      pressureY,
      6,
    );
  }

  popMatrix();
}

function drawAromaLines(x, y) {
  noFill();
  stroke(250, 240, 205, 130);
  strokeWidth(2);

  for (let i = -1; i <= 1; i += 1) {
    const ox = i * 10;

    line(
      x + ox,
      y,
      x + ox - 3,
      y + 7,
    );

    line(
      x + ox - 3,
      y + 7,
      x + ox + 2,
      y + 14,
    );
  }

  noStroke();
}

function drawCap(
  x,
  y,
  rotation,
  size,
) {
  pushMatrix();
  translate(x, y);
  rotate(rotation);

  const r = size / 2;

  noStroke();
  fill(178, 160, 142);

  for (let i = 0; i < 12; i += 1) {
    pushMatrix();
    rotate(i * 30);

    ellipse(
      0,
      r,
      Math.max(
        4,
        size * 0.18,
      ),
    );

    popMatrix();
  }

  fill(205, 185, 165);

  ellipse(
    0,
    0,
    size,
  );

  fill(152, 52, 48);

  ellipse(
    0,
    0,
    size * 0.50,
  );

  popMatrix();
}

function drawIngredientIcon(
  id,
  x,
  y,
  size,
  alpha,
) {
  pushMatrix();
  translate(x, y);
  noStroke();

  if (id === "base_syrup") {
    fill(180, 100, 20, alpha);

    ellipse(
      0,
      -size * 0.08,
      size * 0.72,
    );

    fill(
      225,
      160,
      70,
      alpha * 0.8,
    );

    ellipse(
      -size * 0.14,
      size * 0.12,
      size * 0.18,
    );
  } else if (id === "thick_syrup") {
    fill(120, 60, 10, alpha);

    ellipse(
      0,
      -size * 0.08,
      size * 0.82,
    );

    fill(74, 38, 8, alpha);

    ellipse(
      0,
      -size * 0.12,
      size * 0.42,
    );
  } else if (id === "vanilla") {
    fill(255, 250, 200, alpha);

    ellipse(
      -size * 0.20,
      0,
      size * 0.45,
    );

    ellipse(
      size * 0.20,
      0,
      size * 0.45,
    );

    ellipse(
      0,
      -size * 0.20,
      size * 0.45,
    );

    ellipse(
      0,
      size * 0.20,
      size * 0.45,
    );

    fill(205, 180, 100, alpha);

    ellipse(
      0,
      0,
      size * 0.26,
    );
  } else if (id === "caramel") {
    fill(150, 80, 0, alpha);

    ellipse(
      0,
      0,
      size * 0.82,
    );

    noFill();
    stroke(220, 145, 45, alpha);

    strokeWidth(
      Math.max(
        1.5,
        size * 0.10,
      ),
    );

    ellipse(
      0,
      0,
      size * 0.42,
    );

    noStroke();
  } else if (id === "ginger") {
    fill(200, 180, 80, alpha);
    rectMode(CENTER);

    pushMatrix();
    rotate(16);

    rect(
      0,
      0,
      size * 0.78,
      size * 0.28,
      3,
    );

    popMatrix();

    pushMatrix();
    translate(
      size * 0.18,
      -size * 0.17,
    );

    rotate(-34);

    rect(
      0,
      0,
      size * 0.42,
      size * 0.22,
      3,
    );

    popMatrix();

    rectMode(CORNER);
  } else if (id === "cinnamon") {
    fill(160, 70, 30, alpha);
    rectMode(CENTER);

    pushMatrix();
    translate(
      -size * 0.14,
      0,
    );

    rotate(20);

    rect(
      0,
      0,
      size * 0.18,
      size * 0.78,
      3,
    );

    popMatrix();

    pushMatrix();
    translate(
      size * 0.14,
      0,
    );

    rotate(20);

    rect(
      0,
      0,
      size * 0.18,
      size * 0.78,
      3,
    );

    popMatrix();

    rectMode(CORNER);
  } else if (id === "lemon_peel") {
    fill(225, 220, 62, alpha);

    ellipse(
      0,
      0,
      size * 0.82,
    );

    fill(40, 34, 34, alpha);

    ellipse(
      size * 0.22,
      -size * 0.20,
      size * 0.78,
    );
  } else if (id === "ice") {
    fill(200, 240, 255, alpha);
    rectMode(CENTER);

    pushMatrix();
    rotate(45);

    rect(
      0,
      0,
      size * 0.58,
      size * 0.58,
      3,
    );

    popMatrix();

    rectMode(CORNER);
  } else if (id === "herb") {
    fill(50, 110, 55, alpha);

    pushMatrix();
    rotate(-24);

    ellipse(
      0,
      0,
      size * 0.82,
      size * 0.42,
    );

    popMatrix();
  } else if (id === "brown_sugar") {
    fill(82, 52, 24, alpha);
    rectMode(CENTER);

    rect(
      0,
      0,
      size * 0.60,
      size * 0.60,
      3,
    );

    rectMode(CORNER);
  } else if (id === "secret_syrup") {
    fill(58, 25, 68, alpha);

    ellipse(
      0,
      0,
      size * 0.82,
    );

    fill(205, 120, 210, alpha);
    rectMode(CENTER);

    pushMatrix();
    rotate(45);

    rect(
      0,
      0,
      size * 0.28,
      size * 0.28,
      2,
    );

    popMatrix();

    rectMode(CORNER);
  } else {
    fill(205, 200, 195, alpha);

    ellipse(
      0,
      0,
      size * 0.55,
    );
  }

  popMatrix();
}
