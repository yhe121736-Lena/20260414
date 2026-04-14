let gameState = "START"; // START, PLAYING, GAMEOVER, WIN, ATTACKING
let particles = [];      // 粒子陣列
let shakeTime = 0;       // 震動計時器
let bgStars = [];        // 背景星星陣列
let comets = [];         // 彗星陣列
let ufos = [];           // 幽浮陣列
let ufoHum;              // UFO 電磁音效
let radarBeep;           // 雷達掃描音效
let lastBeepTime = 0;    // 上次鳴叫時間
let isOscillatorStarted = false; // 音效啟動標記

// 獵人遊戲變數
let blocks = [];
let score = 0;
let gameTimer = 60;      // 遊戲時限 (秒)
let startTime = 0;
let colorOptions = [];
let nextTargetChange = 0;
let targetCol = 0;       // 目標欄位
let targetRow = 0;       // 目標列位
let combo = 0;           // 連擊數
let cols, rows;          // 網格行列數
let cellW, cellH;        // 格子寬高
let attackScale = 0;     // 飛碟突擊縮放比例

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 初始化音效 (使用合成器避免外部檔案載入失敗)
  ufoHum = new p5.Oscillator('sine');
  ufoHum.freq(100);
  ufoHum.amp(0);

  // 初始化雷達嗶嗶音 (使用方波更有科技感)
  radarBeep = new p5.Oscillator('square');
  radarBeep.amp(0);

  // 初始化顏色選項
  colorOptions = [
    { name: "脈衝紅", value: color(255, 50, 50), code: "#FF3232" },
    { name: "離子綠", value: color(50, 255, 100), code: "#32FF64" },
    { name: "超空間藍", value: color(50, 150, 255), code: "#3296FF" },
    { name: "質子黃", value: color(255, 220, 0), code: "#FFDC00" }
  ];

  // 計算網格
  cols = 10;
  rows = 8;

  createStars();
  pickTargetCoordinate();
}

function createStars() {
  bgStars = [];
  for (let i = 0; i < 200; i++) {
    bgStars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3),
      brightness: random(100, 255)
    });
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createStars();
  initGrid();       // 重新計算網格大小
  comets = [];      // 清空彗星
  ufos = [];        // 清空幽浮
}

function draw() {
  // 畫面震動處理
  if (shakeTime > 0) {
    let s = map(shakeTime, 0, 30, 2, 15); // 抖動幅度隨時間減弱
    translate(random(-s, s), random(-s, s));
    shakeTime--;
  }

  background(5, 5, 20); // 更深邃的宇宙黑
  drawStars();          // 繪製背景星星
  updateAndDrawComets(); // 更新並繪製背景彗星
  updateAndDrawUFOs();   // 更新並繪製幽浮

  if (gameState === "START") {
    drawStartScreen();
  } else if (gameState === "PLAYING") {
    updateRadarAudio(); // 更新雷達音效頻率
    updateAndDrawGrid();
    drawUI();
    drawCrosshair(); // 加入瞄準準星
    checkTimer();
  } else if (gameState === "GAMEOVER") {
    drawGameOver();
  } else if (gameState === "ATTACKING") {
    drawUFOAttack();
  } else if (gameState === "WIN") {
    drawWinScreen();
  }

  // 更新並繪製粒子
  updateAndDrawParticles();
}

function drawStars() {
  noStroke();
  for (let s of bgStars) {
    // 讓星星有輕微閃爍感
    let b = s.brightness + sin(frameCount * 0.05 + s.x) * 50;
    fill(b, b, 255, 200);
    ellipse(s.x, s.y, s.size);
  }
}

// 彗星系統
function updateAndDrawComets() {
  // 1. 產生環境閃爍光效果
  if (comets.length > 0) {
    push();
    // 根據彗星數量計算亮度，並加上正弦波產生閃爍感
    let ambientAlpha = constrain(comets.length * 10 + sin(frameCount * 0.5) * 8, 0, 45);
    fill(200, 230, 255, ambientAlpha); // 淡淡的彗星冷色光
    noStroke();
    rect(0, 0, width, height);
    pop();
  }

  // 隨機產生彗星 (約每 120 幀出現一顆)
  if (random(1) < 0.008) {
    comets.push({
      x: random(width),
      y: -50,
      vx: random(4, 10),
      vy: random(4, 10),
      size: random(2, 4),
      tailLen: random(15, 30)
    });
  }

  for (let i = comets.length - 1; i >= 0; i--) {
    let c = comets[i];
    c.x += c.vx;
    c.y += c.vy;

    // 繪製彗星尾巴 (數個連續縮小的圓點)
    for (let j = 0; j < c.tailLen; j++) {
      let tx = c.x - (c.vx * j * 0.8);
      let ty = c.y - (c.vy * j * 0.8);
      let alpha = map(j, 0, c.tailLen, 200, 0);
      let s = map(j, 0, c.tailLen, c.size, 0.5);
      
      noStroke();
      fill(200, 230, 255, alpha);
      ellipse(tx, ty, s);
    }

    // 移除超出螢幕的彗星
    if (c.x > width + 200 || c.y > height + 200) {
      comets.splice(i, 1);
    }
  }
}

// 幽浮系統
function updateAndDrawUFOs() {
  // 極低機率產生幽浮 (約每 500 幀出現一次)
  if (random(1) < 0.002) {
    let direction = random() > 0.5 ? 1 : -1;
    ufos.push({
      x: direction === 1 ? -100 : width + 100,
      y: random(height * 0.2, height * 0.8),
      vx: random(2, 4) * direction,
      size: random(30, 50),
      wobbleOffset: random(TWO_PI)
    });
  }

  for (let i = ufos.length - 1; i >= 0; i--) {
    let u = ufos[i];
    u.x += u.vx;
    // 上下漂浮律動
    let currentY = u.y + sin(frameCount * 0.1 + u.wobbleOffset) * 15;

    // 音效處理：根據 UFO 是否在畫面中調整音量
    if (ufos.length > 0) {
      if (getAudioContext().state !== 'running') getAudioContext().resume();
      ufoHum.start();
      ufoHum.amp(0.1, 0.1); // 漸強
      ufoHum.freq(100 + sin(frameCount * 0.2) * 50); // 頻率抖動營造電磁感
    } else {
      ufoHum.amp(0, 0.5); // 漸弱
    }

    // 灑下星塵粒子 (每 3 幀產生一個)
    if (frameCount % 3 === 0) {
      particles.push({
        x: u.x + random(-u.size * 0.3, u.size * 0.3),
        y: currentY + u.size * 0.1, // 從機身底部灑出
        vx: u.vx * 0.5 + random(-0.5, 0.5), // 帶有原本幽浮的部分慣性
        vy: random(0.5, 2), // 緩慢下墜
        life: 100 + random(50),
        col: color(100, 255, 255, 180) // 與駕駛艙相同的青色星塵
      });
    }

    push();
    translate(u.x, currentY);
    
    // 1. 繪製半透明駕駛艙
    fill(100, 255, 255, 150);
    noStroke();
    arc(0, -u.size * 0.1, u.size * 0.5, u.size * 0.6, PI, TWO_PI);

    // 2. 繪製金屬機身
    fill(150, 150, 180);
    ellipse(0, 0, u.size, u.size * 0.4);

    // 3. 繪製底部閃爍燈光
    let colors = [color(255, 0, 0), color(0, 255, 0), color(255, 255, 0)];
    let lightIdx = floor(frameCount / 10) % 3;
    for (let j = -1; j <= 1; j++) {
      let lightCol = (j + 1 === lightIdx) ? colors[lightIdx] : color(50);
      fill(lightCol);
      ellipse(j * u.size * 0.25, u.size * 0.05, u.size * 0.1);
    }
    
    // 4. 側邊推進器微光
    fill(255, 255, 200, 50);
    ellipse(0, u.size * 0.1, u.size * 0.8, u.size * 0.1);
    
    pop();

    // 移除超出螢幕的幽浮
    if (u.x > width + 200 || u.x < -200) {
      ufos.splice(i, 1);
      if (ufos.length === 0) ufoHum.amp(0, 0.5); // 沒幽浮時靜音
    }
  }
}

function pickTargetCoordinate() {
  targetCol = floor(random(cols));
  targetRow = floor(random(rows));
  nextTargetChange = millis() + 8000; // 8 秒內必須擊落
}

function updateAndDrawGrid() {
  // 如果時間到還沒點擊，觸發飛碟攻擊
  if (millis() > nextTargetChange && gameState === "PLAYING") {
    gameState = "ATTACKING";
    attackScale = 0.1;
  }

  // 檢查是否需要初始化網格
  if (blocks.length === 0) initGrid();

  for (let i = blocks.length - 1; i >= 0; i--) {
    blocks[i].display();
  }
}

function initGrid() {
  blocks = [];
  cellW = width / cols;
  cellH = (height - 80) / rows; // 扣除頂部 UI 高度
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      blocks.push(new RadarTarget(i, j));
    }
  }
}


function drawUI() {
  // 頂部科技感邊框
  fill(0, 180);
  noStroke();
  rect(0, 0, width, 80);
  stroke(100, 255, 255, 100);
  line(0, 80, width, 80);
  
  fill(255);
  textSize(22);
  textAlign(LEFT, CENTER);
  text(`能量: ${score}`, 30, 30);
  fill(100, 255, 255);
  textSize(16);
  text(`Combo: ${combo}`, 30, 55);
  
  let remaining = max(0, ceil(gameTimer - (millis() - startTime) / 1000));
  textAlign(RIGHT, CENTER);
  fill(255);
  text(`剩餘時間: ${remaining}s`, width - 30, 40);

  // 飛碟威脅進度條 (8秒倒數)
  let threatTime = max(0, nextTargetChange - millis());
  let threatWidth = map(threatTime, 0, 8000, 0, 200);
  noStroke();
  fill(255, 50, 50, 150);
  rect(width/2 - 100, 25, 200, 10, 5);
  fill(255, 50, 50);
  rect(width/2 - 100, 25, threatWidth, 10, 5);
  textAlign(CENTER);
  textSize(12);
  text("威脅接近中", width/2, 50);

  // 繪製網格編號 (HUD 風格)
  push();
  textSize(12);
  textFont('monospace');
  textAlign(CENTER, CENTER);
  fill(100, 255, 255, 200);
  
  // 加上淡淡的發光感
  drawingContext.shadowBlur = 5;
  drawingContext.shadowColor = 'cyan';

  // 頂部欄號 (1-10)
  for (let i = 0; i < cols; i++) {
    text(`CH-${i + 1}`, i * cellW + cellW / 2, 72);
  }
  // 左側列號 (1-8)
  for (let j = 0; j < rows; j++) {
    text(j + 1, 15, j * cellH + cellH / 2 + 80);
  }
  pop();
}

function updateRadarAudio() {
  // 只有當滑鼠在網格區域內時才發出聲音
  if (mouseY < 80) return;

  // 獲取目前滑鼠所在的網格座標
  let mCol = floor(constrain(mouseX / cellW, 0, cols - 1));
  let mRow = floor(constrain((mouseY - 80) / cellH, 0, rows - 1));

  // 計算網格距離
  let d = dist(mCol, mRow, targetCol, targetRow);
  let maxD = dist(0, 0, cols, rows);

  // 根據距離映射嗶嗶聲的間隔時間 (越近越快，150ms 到 1500ms)
  let beepInterval = map(d, 0, maxD, 150, 1500);

  if (millis() - lastBeepTime > beepInterval) {
    // 距離越近音調也越高 (880Hz 到 220Hz)
    radarBeep.freq(map(d, 0, maxD, 880, 220));
    radarBeep.amp(0.15, 0.01); // 快速推高音量
    radarBeep.amp(0, 0.1, 0.05); // 0.05 秒後快速降回 0，形成「嗶」的一聲
    lastBeepTime = millis();
  }
}

function drawCrosshair() {
  push();
  stroke(100, 255, 255, 150);
  strokeWeight(1);
  // 長十字線
  line(mouseX, 80, mouseX, height);
  line(0, mouseY, width, mouseY);
  
  // 瞄準小方框
  noFill();
  rectMode(CENTER);
  rect(mouseX, mouseY, 40, 40);
  line(mouseX-5, mouseY, mouseX+5, mouseY);
  line(mouseX, mouseY-5, mouseX, mouseY+5);
  pop();
}

class RadarTarget {
  constructor(col, row) {
    this.col = col;
    this.row = row;
    // 計算中心座標
    this.x = col * cellW + cellW / 2;
    this.y = row * cellH + cellH / 2 + 80; // 往下偏移 UI 的高度

    this.colorObj = random(colorOptions);
    this.w = cellW * 0.8;
    this.h = cellH * 0.8;
    this.isScanned = false;
  }

  display() {
    // 檢查滑鼠是否懸停在當前格子
    let isHover = (mouseX > this.x - this.w/2 && mouseX < this.x + this.w/2 &&
                   mouseY > this.y - this.h/2 && mouseY < this.y + this.h/2);

    push();
    translate(this.x, this.y);
    rectMode(CENTER);

    // 繪製靜態網格背景線
    noFill();
    stroke(100, 255, 255, 30);
    strokeWeight(1);
    rect(0, 0, cellW, cellH);

    if (isHover) {
      let gridDist = dist(this.col, this.row, targetCol, targetRow);
      let maxGridDist = dist(0, 0, cols, rows);
      
      let factor = map(gridDist, 0, maxGridDist, 1, 0);
      factor = pow(factor, 2.5); // 讓接近目標時的變化更劇烈

      let isTarget = (this.col === targetCol && this.row === targetRow);
      let c = isTarget ? color(255, 50, 50) : lerpColor(color(0, 255, 255, 100), color(255, 50, 50), factor);

      // 繪製雷達脈衝波 (越近波越大、越快)
      let pulseSpeed = map(factor, 0, 1, 2, 8);
      let circSize = (frameCount * pulseSpeed) % (cellW * (0.5 + factor * 1.5));
      
      // 如果是目標，顯示飛碟剪影
      if (isTarget && factor > 0.8) drawTargetUFO(0, 0, factor * 40);

      noFill();
      stroke(c);
      ellipse(0, 0, circSize);
      ellipse(0, 0, circSize * 0.6);
    }
    pop();
  }
}

function drawTargetUFO(x, y, sz) {
  push();
  translate(x, y);
  fill(255, 50, 50, 200);
  noStroke();
  // 飛碟座艙
  arc(0, -sz*0.1, sz*0.5, sz*0.6, PI, TWO_PI);
  // 飛碟主體
  ellipse(0, 0, sz, sz*0.4);
  // 底部燈光
  fill(255, 255, 255);
  ellipse(0, sz*0.05, sz*0.1);
  pop();
}

function drawUFOAttack() {
  // 計算目標原本在畫面上的中心點
  let tx = targetCol * cellW + cellW / 2;
  let ty = targetRow * cellH + cellH / 2 + 80;

  // 飛碟迅速放大
  attackScale += 0.01; // 大幅降低速度，讓玩家看清楚飛過來的過程
  let currentSize = attackScale * width;
  
  // 畫面震動隨飛船接近而增強 (從輕微抖動變為劇烈震動)
  shakeTime = floor(map(attackScale, 0.1, 1.5, 5, 30));
  
  background(10, 0, 0, 50);
  drawTargetUFO(tx, ty, currentSize);

  // 當飛碟蓋過全螢幕時失敗
  if (currentSize > width * 1.5) {
    gameState = "GAMEOVER";
  }
}

function checkTimer() {
  if (millis() - startTime > gameTimer * 1000) {
    gameState = "WIN";
  }
}

function createExplosion(x, y, col, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x, y: y,
      vx: random(-4, 4), vy: random(-4, 4),
      life: 200, col: col
    });
  }
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.life -= 5;
    fill(red(p.col), green(p.col), blue(p.col), p.life);
    noStroke();
    ellipse(p.x, p.y, map(p.life, 0, 200, 0, 8));
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawStartScreen() {
  // 繪製半透明遮罩讓背景星星若隱若現
  background(5, 5, 25, 150);
  
  fill(100, 255, 255);
  textAlign(CENTER, CENTER);
  textFont('monospace');
  textSize(42);
  text("★ 星際座標獵人 ★", width / 2, height / 2 - 50);
  
  fill(255);
  textSize(16);
  let instructions = "【 任務簡報 】\n\n1. 移動滑鼠進行網格探索，偵測隱藏的外星飛船\n2. 越接近目標，雷達波越劇烈、頻率越快\n3. 必須在飛船發動突襲前點擊座標將其擊落\n4. 連續擊落可獲得 Combo 加成";
  text(instructions, width / 2, height / 2 + 80);
  textSize(20);
  // 閃爍效果的提示文字
  let blink = map(sin(frameCount * 0.1), -1, 1, 100, 255);
  fill(100, 255, 255, blink);
  text(">>> 初始化系統：點擊進入駕駛艙 <<<", width / 2, height / 2 + 220);
  
  // 裝飾用 UI 線條
  stroke(100, 255, 255, 50);
  line(width/2 - 150, height/2 - 20, width/2 + 150, height/2 - 20);
}

function drawGameOver() {
  background(50, 0, 0, 150);
  fill(255);
  textAlign(CENTER);
  textSize(40);
  text("任務失敗", width / 2, height / 2);
  textSize(20);
  text("點擊畫面返回主選單", width / 2, height / 2 + 50);
}

function drawWinScreen() {
  background(0, 50, 0, 150);
  fill(255);
  textAlign(CENTER);
  textSize(40);
  text("任務完成！", width / 2, height / 2 - 30);
  textSize(24);
  text(`最終收穫能量: ${score}`, width / 2, height / 2 + 20);
  textSize(18);
  text("點擊畫面返回主選單", width / 2, height / 2 + 80);
}

function mousePressed() {
  if (!isOscillatorStarted) {
    userStartAudio();
    ufoHum.start();
    ufoHum.amp(0);
    radarBeep.start();
    radarBeep.amp(0);
    isOscillatorStarted = true;
  }

  if (gameState === "PLAYING") {
    // 檢查點擊是否命中亮起的目標
    let hit = false;
    for (let b of blocks) {
      // 檢查是否點擊在格子範圍內
      if (mouseX > b.x - b.w/2 && mouseX < b.x + b.w/2 &&
          mouseY > b.y - b.h/2 && mouseY < b.y + b.h/2) {
        if (b.col === targetCol && b.row === targetRow) {
          score += (10 + combo);
          combo++;
          createExplosion(b.x, b.y, color(255, 255, 0), 20);
          pickTargetCoordinate(); // 成功後立即換下一個座標
        } else {
          score = max(0, score - 5);
          combo = 0;
          shakeTime = 30; // 延長抖動時間，配合 draw 中的新邏輯會更劇烈
          createExplosion(b.x, b.y, color(255, 0, 0), 10);
        }
        hit = true;
        break;
      }
    }
  } else if (gameState === "START") {
    // 從主頁點擊：正式初始化並開始遊戲
    score = 0;
    combo = 0;
    attackScale = 0;
    blocks = [];
    particles = [];
    startTime = millis();
    pickTargetCoordinate();
    gameState = "PLAYING";
  } else {
    // 從結束或攻擊畫面點擊：回到主選單
    gameState = "START";
  }
}
