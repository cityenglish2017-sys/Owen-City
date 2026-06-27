const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const message = document.getElementById("message");

let selectedUnit = null;
let support = 65;
let money = 100;
let day = 1;
let hour = 8;
let isNight = false;
let electionTimer = 100;
let gameOver = false;

let currentEvent = null;
let vehicles = [];
let citizens = [];
let cars = [];

const upgrades = {
  police: 1,
  fire: 1,
  ambulance: 1,
  tow: 1,
  garbage: 1
};

const stations = {
  police: { x: 90, y: 500, label: "경찰서", color: "#246bfe", emoji: "🚓" },
  fire: { x: 250, y: 500, label: "소방서", color: "#e53935", emoji: "🚒" },
  ambulance: { x: 410, y: 500, label: "병원", color: "#ffffff", emoji: "🚑" },
  tow: { x: 570, y: 500, label: "정비소", color: "#f6c343", emoji: "🚛" },
  garbage: { x: 730, y: 500, label: "청소센터", color: "#2ecc71", emoji: "🚚" }
};

const eventList = [
  { type: "fire", text: "건물 화재 발생!", need: "fire", emoji: "🔥", day: 3, night: 2 },
  { type: "sick", text: "아픈 시민 발생!", need: "ambulance", emoji: "🤒", day: 4, night: 2 },
  { type: "thief", text: "도둑 출현!", need: "police", emoji: "🦹", day: 1, night: 5 },
  { type: "bank", text: "은행 강도 발생!", need: "police", emoji: "🏦💰", day: 1, night: 4 },
  { type: "broken", text: "차량 고장! 견인 필요!", need: "tow", emoji: "🚗🔧", day: 3, night: 2 },
  { type: "trash", text: "쓰레기 민원 발생!", need: "garbage", emoji: "🗑️", day: 5, night: 1 },
  { type: "accident", text: "교통사고 발생!", need: "ambulance", emoji: "💥", day: 2, night: 5 }
];

function initCitizens() {
  for (let i = 0; i < 24; i++) {
    citizens.push({
      x: Math.random() * 860 + 60,
      y: Math.random() * 260 + 150,
      dx: Math.random() > 0.5 ? 0.4 : -0.4,
      mood: "normal"
    });
  }
}

function initCars() {
  for (let i = 0; i < 8; i++) {
    cars.push({
      x: Math.random() * 1000,
      y: 365 + Math.random() * 55,
      speed: 1 + Math.random() * 1.5,
      color: randomCarColor()
    });
  }
}

function randomCarColor() {
  const colors = ["#ff7675", "#74b9ff", "#55efc4", "#fdcb6e", "#a29bfe"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function selectUnit(unit) {
  if (gameOver) return;
  selectedUnit = unit;
  message.innerText = `${unitName(unit)} 선택! 사건 위치를 클릭하세요.`;
  beep(700, 0.08);
}

canvas.addEventListener("click", e => {
  if (!currentEvent || !selectedUnit || gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const d = Math.hypot(mx - currentEvent.x, my - currentEvent.y);

  if (d < 75) {
    dispatchVehicle(selectedUnit);
  }
});

function dispatchVehicle(unit) {
  const station = stations[unit];
  const speedBonus = upgrades[unit] * 0.6;

  vehicles.push({
    unit,
    x: station.x,
    y: station.y,
    tx: currentEvent.x,
    ty: currentEvent.y,
    speed: 3 + speedBonus,
    solving: currentEvent.need === unit
  });

  siren(unit);

  if (unit === currentEvent.need) {
    support += 8;
    money += 25;
    message.innerText = `성공! Owen 시장의 빠른 출동으로 사건 해결!`;
  } else {
    support -= 12;
    money -= 10;
    message.innerText = `아차! 이 사건은 ${unitName(currentEvent.need)}가 필요했어요.`;
  }

  support = clamp(support, 0, 100);
  money = Math.max(0, money);

  currentEvent = null;
  selectedUnit = null;
}

function spawnEvent() {
  if (currentEvent || gameOver) return;

  let pool = [];

  eventList.forEach(ev => {
    const weight = isNight ? ev.night : ev.day;
    for (let i = 0; i < weight; i++) pool.push(ev);
  });

  const picked = pool[Math.floor(Math.random() * pool.length)];

  currentEvent = {
    ...picked,
    x: Math.random() * 720 + 130,
    y: Math.random() * 230 + 130,
    timeLeft: 15
  };

  message.innerText = `🚨 ${currentEvent.text}`;
  alarm();
}

function upgrade(type) {
  if (money < 80) {
    message.innerText = "예산이 부족합니다. 사건을 해결해서 예산을 모으세요!";
    return;
  }

  money -= 80;
  upgrades[type]++;
  support += 2;
  support = clamp(support, 0, 100);

  message.innerText = `${stations[type].label} 업그레이드 완료! 출동 속도가 빨라졌습니다.`;
  cheer();
}

function update() {
  if (gameOver) return;

  citizens.forEach(c => {
    c.x += c.dx;
    if (c.x < 40 || c.x > 960) c.dx *= -1;
  });

  cars.forEach(car => {
    car.x += car.speed;
    if (car.x > 1040) car.x = -40;
  });

  vehicles.forEach(v => {
    const dx = v.tx - v.x;
    const dy = v.ty - v.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 3) {
      v.x += dx / dist * v.speed;
      v.y += dy / dist * v.speed;
    } else {
      if (v.solving) {
        support += 1;
      }
    }
  });

  vehicles = vehicles.filter(v => Math.hypot(v.tx - v.x, v.ty - v.y) > 4);

  if (currentEvent) {
    currentEvent.timeLeft -= 1 / 60;

    if (currentEvent.timeLeft <= 0) {
      support -= 15;
      support = clamp(support, 0, 100);
      message.innerText = "사건 해결 실패... 시민들이 불안해합니다.";
      currentEvent = null;
      sadSound();
    }
  }

  electionTimer -= 1 / 60;

  if (electionTimer <= 0) {
    electionTimer = 100;

    if (support >= 55) {
      support += 7;
      money += 100;
      message.innerText = "🎉 Owen 시장 연임 성공! 시민들이 박수를 보냅니다!";
      cheer();
    } else {
      gameOver = true;
      message.innerText = "선거 탈락... Owen 시장의 권한이 박탈되었습니다.";
      sadSound();
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawSky();
  drawRoads();
  drawBuildings();
  drawStations();
  drawCitizens();
  drawCars();

  if (currentEvent) drawEvent();

  vehicles.forEach(drawVehicle);

  drawHUD();

  if (gameOver) drawGameOver();
}

function drawSky() {
  ctx.fillStyle = isNight ? "#12172f" : "#8bd3ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = isNight ? "#f6f1a7" : "#ffd93d";
  ctx.beginPath();
  ctx.arc(870, 70, 38, 0, Math.PI * 2);
  ctx.fill();

  if (isNight) {
    ctx.fillStyle = "white";
    for (let i = 0; i < 35; i++) {
      ctx.fillRect(Math.random() * 1000, Math.random() * 160, 2, 2);
    }
  }
}

function drawRoads() {
  ctx.fillStyle = "#555";
  ctx.fillRect(0, 360, 1000, 70);
  ctx.fillRect(465, 80, 70, 540);

  ctx.strokeStyle = "#fff";
  ctx.setLineDash([25, 18]);
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(0, 395);
  ctx.lineTo(1000, 395);
  ctx.moveTo(500, 80);
  ctx.lineTo(500, 620);
  ctx.stroke();

  ctx.setLineDash([]);
}

function drawBuildings() {
  const buildings = [
    [70, 140, 100, 160, "은행"],
    [220, 110, 120, 190, "상가"],
    [600, 130, 120, 170, "학교"],
    [790, 150, 110, 150, "아파트"],
    [370, 120, 80, 160, "시청"]
  ];

  buildings.forEach(b => {
    ctx.fillStyle = "#b5b5b5";
    ctx.fillRect(b[0], b[1], b[2], b[3]);

    ctx.fillStyle = "#333";
    ctx.font = "17px Arial";
    ctx.fillText(b[4], b[0] + 25, b[1] + 28);

    for (let x = b[0] + 15; x < b[0] + b[2] - 10; x += 28) {
      for (let y = b[1] + 50; y < b[1] + b[3] - 15; y += 32) {
        ctx.fillStyle = isNight ? "#ffe66d" : "#74b9ff";
        ctx.fillRect(x, y, 15, 15);
      }
    }
  });

  ctx.fillStyle = "#dfe6e9";
  ctx.fillRect(420, 70, 40, 50);
  ctx.fillStyle = "#2d3436";
  ctx.font = "24px Arial";
  ctx.fillText("🏛️", 423, 105);
}

function drawStations() {
  Object.keys(stations).forEach(key => {
    const s = stations[key];

    ctx.fillStyle = s.color;
    ctx.fillRect(s.x - 55, s.y - 40, 110, 75);

    ctx.fillStyle = key === "ambulance" ? "#d63031" : "#fff";
    ctx.font = "16px Arial";
    ctx.fillText(s.label, s.x - 35, s.y);

    ctx.font = "24px Arial";
    ctx.fillText(s.emoji, s.x - 14, s.y + 28);

    ctx.fillStyle = "#111";
    ctx.font = "12px Arial";
    ctx.fillText(`Lv.${upgrades[key]}`, s.x - 15, s.y - 20);
  });
}

function drawCitizens() {
  citizens.forEach(c => {
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(c.x, c.y + 6);
    ctx.lineTo(c.x, c.y + 25);
    ctx.moveTo(c.x - 9, c.y + 14);
    ctx.lineTo(c.x + 9, c.y + 14);
    ctx.moveTo(c.x, c.y + 25);
    ctx.lineTo(c.x - 8, c.y + 38);
    ctx.moveTo(c.x, c.y + 25);
    ctx.lineTo(c.x + 8, c.y + 38);
    ctx.stroke();
  });
}

function drawCars() {
  cars.forEach(car => {
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x, car.y, 44, 22);

    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(car.x + 10, car.y + 23, 5, 0, Math.PI * 2);
    ctx.arc(car.x + 34, car.y + 23, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEvent() {
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(currentEvent.x, currentEvent.y, 52, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#000";
  ctx.font = "34px Arial";
  ctx.fillText(currentEvent.emoji, currentEvent.x - 30, currentEvent.y + 10);

  ctx.font = "15px Arial";
  ctx.fillText(`남은 시간 ${Math.ceil(currentEvent.timeLeft)}`, currentEvent.x - 38, currentEvent.y + 68);
}

function drawVehicle(v) {
  ctx.fillStyle = unitColor(v.unit);
  ctx.fillRect(v.x - 24, v.y - 14, 48, 28);

  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(v.x - 13, v.y + 15, 5, 0, Math.PI * 2);
  ctx.arc(v.x + 13, v.y + 15, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "20px Arial";
  ctx.fillText(unitEmoji(v.unit), v.x - 13, v.y + 8);
}

function drawHUD() {
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(15, 15, 330, 115);

  ctx.fillStyle = "#111";
  ctx.font = "18px Arial";
  ctx.fillText(`👑 시장: Owen`, 30, 42);
  ctx.fillText(`📅 Day ${day} / ${hour}:00 / ${isNight ? "밤" : "낮"}`, 30, 67);
  ctx.fillText(`❤️ 시민 지지도: ${support}%`, 30, 92);
  ctx.fillText(`💰 예산: ${money}`, 30, 117);

  ctx.fillStyle = "#fff";
  ctx.fillRect(730, 20, 230, 45);
  ctx.fillStyle = "#111";
  ctx.font = "17px Arial";
  ctx.fillText(`다음 선거까지 ${Math.ceil(electionTimer)}초`, 750, 49);
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  ctx.font = "48px Arial";
  ctx.fillText("GAME OVER", 350, 270);

  ctx.font = "24px Arial";
  ctx.fillText("Owen 시장이 선거에서 탈락했습니다.", 310, 320);
}

function updateTime() {
  hour++;
  if (hour >= 24) {
    hour = 0;
    day++;
  }

  isNight = hour >= 19 || hour < 6;
}

function unitName(unit) {
  return {
    police: "경찰차",
    fire: "소방차",
    ambulance: "구급차",
    tow: "견인차",
    garbage: "쓰레기차"
  }[unit];
}

function unitEmoji(unit) {
  return {
    police: "🚓",
    fire: "🚒",
    ambulance: "🚑",
    tow: "🚛",
    garbage: "🚚"
  }[unit];
}

function unitColor(unit) {
  return {
    police: "#246bfe",
    fire: "#e53935",
    ambulance: "#ffffff",
    tow: "#f6c343",
    garbage: "#2ecc71"
  }[unit];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/* 사운드 */
let audioCtx;

function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function beep(freq, duration) {
  const audio = getAudio();
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.frequency.value = freq;
  osc.type = "square";

  gain.gain.value = 0.06;

  osc.connect(gain);
  gain.connect(audio.destination);

  osc.start();
  osc.stop(audio.currentTime + duration);
}

function alarm() {
  beep(900, 0.12);
  setTimeout(() => beep(500, 0.12), 160);
}

function siren(unit) {
  let count = 0;
  const timer = setInterval(() => {
    beep(count % 2 === 0 ? 780 : 430, 0.12);
    count++;
    if (count > 8) clearInterval(timer);
  }, 160);
}

function cheer() {
  beep(600, 0.1);
  setTimeout(() => beep(800, 0.1), 130);
  setTimeout(() => beep(1000, 0.15), 270);
}

function sadSound() {
  beep(300, 0.18);
  setTimeout(() => beep(220, 0.25), 250);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

initCitizens();
initCars();

setInterval(updateTime, 3000);

setInterval(() => {
  if (!currentEvent && Math.random() < 0.75) {
    spawnEvent();
  }
}, 5000);

gameLoop();