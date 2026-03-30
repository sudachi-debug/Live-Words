// ===== 設定 =====
const COLORS = ["#00e5ff","#69f0ae","#ffd740","#ff5252","#b388ff"];

const STOP_WORDS = [
  "えー","あの","これ","それ","まあ","ちょっと","その","そして",
  "はい","そう","なるほど","えっと","です","ます"
];

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

// ===== UI =====
function updateStatus(){
  document.getElementById("status").innerText =
    running ? "● Listening..." : "停止中";
}

function updateMode(){
  document.getElementById("modeLabel").innerText =
    mode==="flow" ? "モード：フロー" : "モード：ネットワーク";
}

// ===== 音声 =====
function start(){
  if(running) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.continuous = true;
  recognition.interimResults = true;

  running = true;
  updateStatus();

  recognition.onresult = (e)=>{
    let text="";
    for(let i=e.resultIndex;i<e.results.length;i++){
      text += e.results[i][0].transcript;
    }
    processText(text);
  };

  recognition.onend = ()=>{
    setTimeout(()=>{
      if(running) recognition.start();
    },200);
  };

  recognition.start();
}

function stop(){
  running = false;
  if(recognition) recognition.stop();
  updateStatus();
}

// ===== 精度①：日本語分割 =====
function splitJapanese(text){
  return text
    .replace(/(は|が|を|に|で|と|も|の|へ|や|ね|よ)/g, "$1 ")
    .replace(/(する|した|して|いる|なる)/g, "$1 ")
    .replace(/([ぁ-んァ-ン一-龥]{2,})/g, "$1 ")
    .split(/\s+/);
}

// ===== 精度②：繰り返し検出 =====
function extractRepeats(word){
  for(let len = 2; len <= word.length/2; len++){
    let unit = word.slice(0, len);
    let count = 0;
    let pos = 0;

    while(word.slice(pos, pos + len) === unit){
      count++;
      pos += len;
    }

    if(count >= 2){
      return {
        base: unit,
        count: count
      };
    }
  }
  return { base: word, count: 1 };
}

// ===== テキスト処理 =====
function processText(text){

  let tokens = splitJapanese(text);
  let current = [];

  tokens.forEach(w=>{
    w = w.trim();
    if(!w) return;

    if(w.length === 1) return;

    let { base, count } = extractRepeats(w);
    let word = base;

    if(NORMALIZE[word]) word = NORMALIZE[word];
    if(STOP_WORDS.includes(word)) return;

    if(!words[word]){
      words[word] = {
        count:0,
        weight:0,
        group: Math.floor(Math.random()*COLORS.length)
      };
    }

    words[word].count += count;

    let boost = BOOST.includes(word) ? 2 : 1;
    words[word].weight = words[word].count * boost;

    current.push(word);

    flow.push({
      text:word,
      x:canvas.width,
      y:Math.random()*canvas.height,
      size:14 + words[word].weight*2,
      group:words[word].group,
      t:Math.random()*1000
    });
  });

  current.forEach(a=>{
    current.forEach(b=>{
      if(a!==b){
        let key=a+"_"+b;
        edges[key]=(edges[key]||0)+1;
      }
    });
  });

  if(Object.keys(words).length > 30){
    let sorted = Object.entries(words).sort((a,b)=>a[1].weight-b[1].weight);
    delete words[sorted[0][0]];
  }
}

// ===== 描画 =====
function draw(){
  drawBackground();

  if(mode==="flow"){
    drawFlow();
  }else{
    drawFlow(0.1);
    drawNetwork();
  }

  requestAnimationFrame(draw);
}
draw();

// ===== 背景 =====
function drawBackground(){
  let grad = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
  grad.addColorStop(0,"#0f2027");
  grad.addColorStop(1,"#203a43");
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,canvas.width,canvas.height);
}

// ===== フロー =====
function drawFlow(alpha=1){
  ctx.globalAlpha = alpha;

  flow.forEach((f,i)=>{
    ctx.fillStyle = COLORS[f.group];
    ctx.font = f.size+"px sans-serif";

    ctx.shadowColor = COLORS[f.group];
    ctx.shadowBlur = 20;

    ctx.fillText(f.text,f.x,f.y);

    f.y += Math.sin(Date.now()*0.002 + f.t)*0.5;
    f.x -= 2 + f.size*0.05;

    if(f.x < -100){
      flow.splice(i,1);
    }
  });

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ===== ネットワーク =====
function drawNetwork(){
  let keys = Object.keys(words);
  if(keys.length === 0) return;

  let cx = canvas.width/2;
  let cy = canvas.height/2;

  let maxWord = keys.sort((a,b)=>words[b].weight-words[a].weight)[0];

  ctx.fillStyle = "#ff5252";
  ctx.font = "bold 42px sans-serif";
  ctx.shadowColor = "#ff5252";
  ctx.shadowBlur = 30;
  ctx.fillText(maxWord, cx - 60, cy);
  ctx.shadowBlur = 0;

  let radius = 220;

  keys.forEach((k,i)=>{
    if(k === maxWord) return;

    let angle = (i/keys.length)*Math.PI*2;
    let x = cx + Math.cos(angle)*radius;
    let y = cy + Math.sin(angle)*radius;

    let strength = edges[maxWord+"_"+k] || 1;

    ctx.strokeStyle = COLORS[words[k].group];
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = Math.min(6, strength*0.5);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.globalAlpha = 1;

    ctx.fillStyle = COLORS[words[k].group];
    ctx.font = (14 + words[k].weight*2) + "px sans-serif";

    ctx.shadowColor = COLORS[words[k].group];
    ctx.shadowBlur = 15;

    ctx.fillText(k, x, y);

    ctx.shadowBlur = 0;
  });
}

// ===== モード =====
function toggleMode(){
  mode = mode==="flow" ? "network" : "flow";
  updateMode();
}

// 初期
updateStatus();
updateMode();