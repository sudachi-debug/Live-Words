let recognition;
let isRunning = false;

function start() {
  if (isRunning) return;

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      let t = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalText += t + "\n";
      } else {
        interimText += t;
      }
    }

    document.getElementById("result").innerText =
      finalText + interimText;
  };

  recognition.onend = () => {
    if (isRunning) recognition.start();
  };

  recognition.start();
  isRunning = true;
}

function stop() {
  isRunning = false;
  if (recognition) recognition.stop();
}