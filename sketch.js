// 絶対に押せないボタン / Web移植スターター版
// 目的：完成版ではなく、Codea Liteエンジンの動作確認用。
// 作品側ではCanvas APIを直接触らず、Codea風APIだけを使う。

let button;
let pointer = null;
let lastPressTime = -999;

const CONFIG = {
  bgColor: color(235, 235, 238),
  panelColor: color(224, 224, 229),
  panelShadow: color(205, 205, 212, 130),
  buttonColor: color(198, 198, 204),
  buttonEdge: color(150, 150, 158),
  buttonPressed: color(164, 174, 190),
  labelColor: color(70, 70, 78),
  hintColor: color(115, 115, 124, 150),

  bodySize: 104,
  escapeDistance: 150,
  escapePower: 440,
  returnSpring: 0.13,
  returnDamping: 0.76,
  maxStretch: 180,
};

function setup() {
  rectMode(CENTER);
  ellipseMode(CENTER);
  textSize(15);

  button = {
    home: vec2(WIDTH / 2, HEIGHT / 2),
    pos: vec2(WIDTH / 2, HEIGHT / 2),
    vel: vec2(0, 0),
    squish: 0,
    mood: 0,
  };
}

function updateButton() {
  // 画面サイズ変更にゆるく追従
  const targetHome = vec2(WIDTH / 2, HEIGHT / 2);
  button.home = button.home.add(targetHome.sub(button.home).mul(0.04));

  let force = button.home.sub(button.pos).mul(CONFIG.returnSpring);

  if (pointer) {
    const d = button.pos.dist(pointer);
    if (d < CONFIG.escapeDistance) {
      const away = button.pos.sub(pointer).normalize();
      const strength = (1 - d / CONFIG.escapeDistance) * CONFIG.escapePower;
      force = force.add(away.mul(strength));
      button.squish = Math.min(1, button.squish + DeltaTime * 5);
      button.mood = Math.min(1, button.mood + DeltaTime * 3);
    }
  }

  button.vel = button.vel.add(force.mul(DeltaTime));
  button.vel = button.vel.mul(CONFIG.returnDamping);
  button.pos = button.pos.add(button.vel);

  // ホームから離れすぎない。逃げるけれど、画面の中に留める。
  const fromHome = button.pos.sub(button.home);
  if (fromHome.len() > CONFIG.maxStretch) {
    button.pos = button.home.add(fromHome.normalize().mul(CONFIG.maxStretch));
    button.vel = button.vel.mul(0.4);
  }

  const margin = CONFIG.bodySize * 0.7;
  button.pos.x = Math.max(margin, Math.min(WIDTH - margin, button.pos.x));
  button.pos.y = Math.max(margin, Math.min(HEIGHT - margin, button.pos.y));

  button.squish = Math.max(0, button.squish - DeltaTime * 2.6);
  button.mood = Math.max(0, button.mood - DeltaTime * 0.7);
}

function draw() {
  background(CONFIG.bgColor);

  updateButton();

  drawQuietPanel();
  drawElasticConnection();
  drawButton();
  drawHint();
}

function drawQuietPanel() {
  const panelW = Math.min(340, WIDTH - 48);
  const panelH = 230;
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;

  noStroke();
  fill(CONFIG.panelShadow);
  rect(cx + 0, cy - 8, panelW, panelH, 24);

  fill(CONFIG.panelColor);
  rect(cx, cy, panelW, panelH, 24);

  noFill();
  stroke(255, 255, 255, 120);
  strokeWidth(1);
  rect(cx, cy + 1, panelW - 4, panelH - 4, 22);
}

function drawElasticConnection() {
  const d = button.pos.dist(button.home);
  if (d < 8) return;

  const alpha = map(Math.min(d, CONFIG.maxStretch), 0, CONFIG.maxStretch, 0, 90);

  stroke(170, 170, 180, alpha);
  strokeWidth(10);
  line(button.home.x, button.home.y, button.pos.x, button.pos.y);

  stroke(238, 238, 242, alpha * 0.7);
  strokeWidth(4);
  line(button.home.x, button.home.y + 2, button.pos.x, button.pos.y + 2);
}

function drawButton() {
  const s = CONFIG.bodySize;
  const squashX = 1 + button.squish * 0.13;
  const squashY = 1 - button.squish * 0.08;

  pushMatrix();
  translate(button.pos.x, button.pos.y);
  scale(squashX, squashY);

  // 影
  noStroke();
  fill(155, 155, 166, 90);
  ellipse(0, -42, s * 0.88, 18);

  // 本体の外側
  fill(CONFIG.buttonEdge);
  ellipse(0, -4, s, s * 0.72);

  // 本体
  const pressedMix = button.mood;
  fill(
    lerp(CONFIG.buttonColor.r, CONFIG.buttonPressed.r, pressedMix),
    lerp(CONFIG.buttonColor.g, CONFIG.buttonPressed.g, pressedMix),
    lerp(CONFIG.buttonColor.b, CONFIG.buttonPressed.b, pressedMix),
    255
  );
  ellipse(0, 4, s * 0.94, s * 0.68);

  // 上面ハイライト
  fill(232, 232, 236, 130);
  ellipse(-14, 18, s * 0.42, s * 0.20);

  // 押せそうで押せない小さな表示
  fill(CONFIG.labelColor);
  textSize(13);
  text("PUSH", 0, 6);

  popMatrix();
}

function drawHint() {
  fill(CONFIG.hintColor);
  noStroke();
  textSize(12);

  const since = ElapsedTime - lastPressTime;
  if (since < 1.6) {
    text("押したつもりだった", WIDTH / 2, HEIGHT / 2 - 150);
  } else {
    text("触ると逃げます", WIDTH / 2, HEIGHT / 2 - 150);
  }
}

function touched(touch) {
  if (touch.state === BEGAN || touch.state === MOVING) {
    pointer = vec2(touch.x, touch.y);

    if (button && button.pos.dist(pointer) < CONFIG.bodySize * 0.48) {
      lastPressTime = ElapsedTime;
    }
  }

  if (touch.state === ENDED || touch.state === CANCELLED) {
    pointer = null;
  }
}
