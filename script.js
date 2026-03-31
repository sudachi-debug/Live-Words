// ===== 設定 =====
const COLORS = [”#00e5ff”,”#69f0ae”,”#ffd740”,”#ff5252”,”#b388ff”];

const STOP_WORDS = [
“えー”,“あの”,“これ”,“それ”,“まあ”,“ちょっと”,“その”,“そして”,
“はい”,“そう”,“なるほど”,“えっと”,“です”,“ます”
];

const NORMALIZE = {
“参政”:“参政党”,“参政党”:“参政党”,
“立憲”:“立憲民主党”,“立憲民主党”:“立憲民主党”,
“中道”:“中道改革連合”,“中道改革”:“中道改革連合”,
“自民”:“自由民主党”,“自民党”:“自由民主党”,
“維新”:“日本維新の会”
};

const BOOST = [
“減税”,“教育”,“安全保障”,“子育て”,“経済”,“外交”,
“憲法”,“防衛”,“インフラ”,“エネルギー”,“少子化”
];

const MIN_COUNT = 2; // ★表示しきい値

// ===== 状態 =====
let words = {};
let edges = {};
let flow = [];
let mode = “flow”;
let recognition;
let running = false;
let lastWord = “”; // ★連続防止

// ネットワーク用レイアウトキャッシュ
let networkNodes = [];
let networkDirty = true;

// ===== Canvas =====
const canvas = document.getElementById(“canvas”);
const ctx = canvas.getContext(“2d”);

function resize(){
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
networkDirty = true;
}
resize();
window.onresize = resize;

// ===== UI =====
function updateStatus(){
const dot  = document.getElementById(“dot”);
const text = document.getElementById(“statusText”);
if(running){
dot.className = “active”;
text.textContent = “Listening…”;
} else {
dot.className = “”;
text.textContent = “停止中”;
}
}

function updateMode(){
const btn = document.getElementById(“toggleBtn”);
if(mode === “flow”){
btn.textContent = “共起ネットワーク”;
btn.classList.remove(“active”);
} else {
btn.textContent = “フロー表示”;
btn.classList.add(“active”);
}
}

// ===== 音声 =====
function start(){
if(running) return;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
recognition = new SpeechRecognition();
recognition.lang = “ja-JP”;
recognition.continuous = true;
recognition.interimResults = true;

running = true;
updateStatus();

recognition.onresult = (e)=>{
let text=””;
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

// ===== 日本語分割 =====
function splitJapanese(text){
return text
.replace(/(は|が|を|に|で|と|も|の|へ|や|ね|よ)/g, “$1 “)
.replace(/(する|した|して|いる|なる)/g, “$1 “)
.replace(/([ぁ-んァ-ン一-龥]{2,})/g, “$1 “)
.split(/\s+/);
}

// ===== 繰り返し検出 =====
function extractRepeats(word){
for(let len = 2; len <= word.length/2; len++){
let unit = word.slice(0, len);
let count = 0;
let pos = 0;

```
while(word.slice(pos, pos + len) === unit){
  count++;
  pos += len;
}

if(count >= 2){
  return { base: unit, count: count };
}
```

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

```
if(w.length === 1) return;

let { base, count } = extractRepeats(w);
let word = base;

if(NORMALIZE[word]) word = NORMALIZE[word];
if(STOP_WORDS.includes(word)) return;

// ★連続防止
if(word === lastWord) return;
lastWord = word;

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

// ★表示制限（重要）
if(words[word].count < MIN_COUNT) return;

flow.push({
  text:word,
  x:canvas.width,
  y:80 + Math.random()*(canvas.height-120),
  size:14 + words[word].weight*2,
  group:words[word].group,
  t:Math.random()*1000,
  opacity:0
});

// ★flow上限
if(flow.length > 40){
  flow.shift();
}

networkDirty = true;
```

});

current.forEach(a=>{
current.forEach(b=>{
if(a!==b){
let key=a+”_”+b;
edges[key]=(edges[key]||0)+1;
}
});
});

if(Object.keys(words).length > 30){
let sorted = Object.entries(words).sort((a,b)=>a[1].weight-b[1].weight);
delete words[sorted[0][0]];
networkDirty = true;
}
}

// ===== ネットワークレイアウト計算 =====
function buildNetworkLayout(){
networkDirty = false;
let keys = Object.keys(words);
if(keys.length === 0){ networkNodes = []; return; }

let sorted   = […keys].sort((a,b)=> words[b].weight - words[a].weight);
let topCount = Math.min(3, sorted.length);
let top      = sorted.slice(0, topCount);
let rest     = sorted.slice(topCount);

let cx = canvas.width  / 2;
let cy = canvas.height / 2;

let nodes = [];

// 中心ノード群（縦に並べる）
let centerSpacing = 65;
let centerStartY  = cy - (centerSpacing * (topCount - 1)) / 2;
top.forEach((k, i)=>{
let w = words[k];
nodes.push({
key:   k,
x:     cx,
y:     centerStartY + i * centerSpacing,
size:  Math.max(28, 18 + w.weight * 3.5),
group: w.group,
isTop: true,
rank:  i
});
});

// 周辺ノード（放射状）
let radius = Math.min(canvas.width, canvas.height) * 0.32;
rest.forEach((k, i)=>{
let angle = (i / rest.length) * Math.PI * 2 - Math.PI / 2;
let r = radius * (0.8 + (i % 3) * 0.1);
let w = words[k];
nodes.push({
key:   k,
x:     cx + Math.cos(angle) * r,
y:     cy + Math.sin(angle) * r,
size:  Math.max(12, 10 + w.weight * 2),
group: w.group,
isTop: false,
rank:  topCount + i
});
});

networkNodes = nodes;
}

// ===== 描画 =====
function draw(){
drawBackground();

if(mode===“flow”){
drawFlow();
}else{
if(networkDirty) buildNetworkLayout();
drawFlow(0.07);
drawNetwork();
}

requestAnimationFrame(draw);
}
draw();

// ===== 背景 =====
function drawBackground(){
let grad = ctx.createRadialGradient(
canvas.width*0.5, canvas.height*0.4, 0,
canvas.width*0.5, canvas.height*0.5, canvas.width*0.8
);
grad.addColorStop(0,”#0d1b2a”);
grad.addColorStop(1,”#060d1a”);
ctx.fillStyle = grad;
ctx.fillRect(0,0,canvas.width,canvas.height);
}

// ===== フロー =====
function drawFlow(alpha=1){
const now = Date.now();

flow.forEach((f,i)=>{
f.opacity = Math.min(1, (f.opacity||0) + 0.04);

```
ctx.globalAlpha = f.opacity * alpha;
ctx.fillStyle = COLORS[f.group];
ctx.font = `600 ${f.size}px 'Noto Sans JP', sans-serif`;

ctx.shadowColor = COLORS[f.group];
ctx.shadowBlur = 18 + Math.sin(now*0.002 + f.t)*6;

ctx.fillText(f.text,f.x,f.y);

f.y += Math.sin(now*0.0015 + f.t)*0.4;
f.x -= 1.8 + f.size*0.04;

if(f.x < -200){
  flow.splice(i,1);
}
```

});

ctx.shadowBlur = 0;
ctx.globalAlpha = 1;
}

// ===== ネットワーク =====
function drawNetwork(){
if(networkNodes.length === 0) return;

const now      = Date.now();
const topNodes = networkNodes.filter(n=>n.isTop);
const restNodes= networkNodes.filter(n=>!n.isTop);

// ===== エッジ =====
topNodes.forEach(center=>{
restNodes.forEach(node=>{
let strength = (edges[center.key+”*”+node.key]||0) +
(edges[node.key+”*”+center.key]||0);

```
  ctx.globalAlpha = Math.min(0.55, 0.1 + strength*0.08);

  let grad = ctx.createLinearGradient(center.x,center.y,node.x,node.y);
  grad.addColorStop(0, COLORS[center.group]);
  grad.addColorStop(1, COLORS[node.group]);
  ctx.strokeStyle = grad;
  ctx.lineWidth   = Math.max(0.5, Math.min(4, strength*0.4));

  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  ctx.lineTo(node.x,   node.y);
  ctx.stroke();
});
```

});

// top同士のエッジ
for(let i=0;i<topNodes.length;i++){
for(let j=i+1;j<topNodes.length;j++){
let a=topNodes[i], b=topNodes[j];
let s=(edges[a.key+”*”+b.key]||0)+(edges[b.key+”*”+a.key]||0);
ctx.globalAlpha = Math.min(0.4, 0.15+s*0.05);
ctx.strokeStyle = “#ff5252”;
ctx.lineWidth   = 1.5;
ctx.beginPath();
ctx.moveTo(a.x,a.y);
ctx.lineTo(b.x,b.y);
ctx.stroke();
}
}

ctx.globalAlpha = 1;

// ===== 周辺ノード =====
restNodes.forEach(node=>{
let color = COLORS[node.group];
let pulse = Math.sin(now*0.001 + node.rank)*3;

```
ctx.fillStyle  = color;
ctx.font       = `500 ${node.size}px 'Noto Sans JP', sans-serif`;
ctx.shadowColor= color;
ctx.shadowBlur = 12 + pulse;

ctx.fillText(node.key, node.x - ctx.measureText(node.key).width/2, node.y);
```

});

// ===== 中心ノード =====
const centerColors = [”#ff5252”,”#ffd740”,”#69f0ae”];
topNodes.forEach((node,i)=>{
let color = centerColors[i] || COLORS[node.group];
let pulse = Math.sin(now*0.0008 + i*1.2)*5;

```
ctx.font = `900 ${node.size}px 'Noto Sans JP', sans-serif`;
let tw   = ctx.measureText(node.key).width;

ctx.shadowColor = color;
ctx.shadowBlur  = 40 + pulse;
ctx.fillStyle   = color;
ctx.fillText(node.key, node.x - tw/2, node.y);

ctx.shadowBlur  = 0;
ctx.globalAlpha = 0.15;
ctx.fillStyle   = "white";
ctx.fillText(node.key, node.x - tw/2, node.y);
ctx.globalAlpha = 1;
```

});

ctx.shadowBlur = 0;
}

// ===== モード =====
function toggleMode(){
mode = mode===“flow” ? “network” : “flow”;
networkDirty = true;
updateMode();
}

// 初期
updateStatus();
updateMode();