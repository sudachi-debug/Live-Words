// ===== 色 =====
const COLORS = ["#00e5ff","#69f0ae","#ffd740","#ff5252","#b388ff"];

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

// ===== テキスト処理 =====
function processText(text){
  let tokens = text.split(/[、。 ,]/);
  let current = [];

  tokens.forEach(w=>{
    if(!w) return;

    if(!words[w]){
      words[w] = {
        count:0,
        weight:0,
        group: Math.floor(Math.random()*COLORS.length)
      };
    }

    words[w].count++;
    words[w].weight = words[w].count;

    current.push(w);

    flow.push({
      text:w,
      x:canvas.width,
      y:Math.random()*canvas.height,
      size:14 + words[w].weight*2,
      group:words[w].group,
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

    // ゆらぎ
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

  let centerX = canvas.width/2;
  let centerY = canvas.height/2;

  // 最大ワード
  let maxWord = keys.sort((a,b)=>words[b].weight-words[a].weight)[0];

  // 中心
  ctx.fillStyle = "#fff";
  ctx.font = "bold 40px sans-serif";
  ctx.shadowColor = "#ff5252";
  ctx.shadowBlur = 30;
  ctx.fillText(maxWord,centerX-50,centerY);

  ctx.shadowBlur = 0;

  // 周囲配置
  let radius = 200;

  keys.forEach((k,i)=>{
    let angle = (i/keys.length)*Math.PI*2;
    let x = centerX + Math.cos(angle)*radius;
    let y = centerY + Math.sin(angle)*radius;

    // 線
    let key = maxWord+"_"+k;
    let strength = edges[key]||1;

    ctx.strokeStyle = COLORS[words[k].group];
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.min(5,strength*0.3);

    ctx.beginPath();
    ctx.moveTo(centerX,centerY);
    ctx.lineTo(x,y);
    ctx.stroke();

    // ノード
    ctx.globalAlpha = 1;

    let grad = ctx.createRadialGradient(x,y,5,x,y,30);
    grad.addColorStop(0,COLORS[words[k].group]);
    grad.addColorStop(1,"transparent");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x,y,10+words[k].weight,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle="#fff";
    ctx.font="14px sans-serif";
    ctx.fillText(k,x+10,y);
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