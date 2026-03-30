// ===== 設定 =====
const COLORS = ["#ff6b6b","#4dabf7","#51cf66","#ffa94d","#845ef7"];
const STOP_WORDS = ["えー","あの","これ","それ","まあ","ちょっと","その","そして"];

const NORMALIZE = {
  "参政":"参政党","参政党":"参政党",
  "立憲":"立憲民主党","立憲民主党":"立憲民主党",
  "中道":"中道改革連合","中道改革":"中道改革連合",
  "自民":"自由民主党","自民党":"自由民主党",
  "維新":"日本維新の会"
};

const BOOST = [
  "減税","教育","安全保障","子育て","経済","外交",
  "憲法","防衛","インフラ","エネルギー","少子化"
];

// ===== 状態 =====
let words = {};
let edges = {};
let flow = [];
let mode = "flow";
let recognition;
let running = false;

// ===== Canvas =====
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.onresize = resize;

// ===== 音声 =====
function start(){
  if(running) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (e)=>{
    let text = "";
    for(let i=e.resultIndex;i<e.results.length;i++){
      text += e.results[i][0].transcript;
    }
    processText(text);
  };

  recognition.onend = ()=>{
    if(running) recognition.start();
  };

  recognition.start();
  running = true;
}

function stop(){
  running = false;
  if(recognition) recognition.stop();
}

// ===== テキスト処理 =====
function processText(text){
  let tokens = text.split(/[、。 ,]/);

  let currentWords = [];

  tokens.forEach(w=>{
    w = w.trim();
    if(!w || STOP_WORDS.includes(w)) return;

    if(NORMALIZE[w]) w = NORMALIZE[w];

    if(!words[w]){
      words[w] = {
        count: 0,
        weight: 0,
        group: Math.floor(Math.random()*COLORS.length)
      };
    }

    words[w].count++;
    words[w].weight = words[w].count * (BOOST.includes(w) ? 2 : 1);

    currentWords.push(w);

    // フロー用
    flow.push({
      text: w,
      x: canvas.width,
      y: Math.random()*canvas.height,
      size: 10 + words[w].weight * 2,
      group: words[w].group
    });
  });

  // 共起
  currentWords.forEach(a=>{
    currentWords.forEach(b=>{
      if(a===b) return;
      const key = a+"_"+b;
      edges[key] = (edges[key]||0)+1;
    });
  });

  // ワード数制限
  if(Object.keys(words).length > 30){
    let sorted = Object.entries(words).sort((a,b)=>a[1].weight-b[1].weight);
    delete words[sorted[0][0]];
  }
}

// ===== 描画 =====
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(mode==="flow"){
    drawFlow(1);
  }else{
    drawFlow(0.2);
    drawNetwork();
  }

  requestAnimationFrame(draw);
}
draw();

// ===== フロー描画 =====
function drawFlow(alpha){
  ctx.globalAlpha = alpha;

  flow.forEach((f,i)=>{
    ctx.fillStyle = COLORS[f.group];
    ctx.font = f.size+"px sans-serif";
    ctx.fillText(f.text, f.x, f.y);

    f.x -= 2 + f.size*0.05;

    if(f.x < -100){
      flow.splice(i,1);
    }
  });

  ctx.globalAlpha = 1;
}

// ===== ネットワーク =====
function drawNetwork(){
  const keys = Object.keys(words);
  const centerX = canvas.width/2;
  const centerY = canvas.height/2;
  const radius = Math.min(canvas.width,canvas.height)/3;

  let positions = {};

  keys.forEach((k,i)=>{
    const angle = (i/keys.length)*Math.PI*2;
    positions[k] = {
      x: centerX + Math.cos(angle)*radius,
      y: centerY + Math.sin(angle)*radius
    };
  });

  // 線
  Object.keys(edges).forEach(key=>{
    let [a,b] = key.split("_");
    if(!positions[a]||!positions[b]) return;

    let strength = edges[key];
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = Math.min(5, strength*0.5);

    ctx.beginPath();
    ctx.moveTo(positions[a].x, positions[a].y);
    ctx.lineTo(positions[b].x, positions[b].y);
    ctx.stroke();
  });

  // ノード
  keys.forEach(k=>{
    let w = words[k];
    let pos = positions[k];

    ctx.fillStyle = COLORS[w.group];
    ctx.beginPath();
    ctx.arc(pos.x,pos.y,10 + w.weight,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "12px sans-serif";
    ctx.fillText(k,pos.x+10,pos.y);
  });
}

// ===== モード切替 =====
function toggleMode(){
  mode = mode==="flow" ? "network" : "flow";
}