const uploadBox = document.getElementById("upload");
const audioElement = document.getElementById("audio");
const canvas = document.getElementById("canvas");
let context = null;
let animation = null;

function setupAudio(audioElement) {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaElementSource(audioElement);
  const fft = audioContext.createAnalyser();
  fft.fftSize = 512; // Fast Fourier Transform
  const buffer = new Uint8Array(fft.frequencyBinCount);
  source.connect(fft).connect(audioContext.destination);
  return { source, fft, buffer };
}

function playAudioFile(file, player) {
  const reader = new FileReader();
  reader.addEventListener("load", (e) => {
    player.src = e.target.result;
    player.play();
  });
  reader.readAsDataURL(file);
}

function drawFFT(canvas, buffer) {
  const c = canvas.getContext("2d");
  c.save();
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.translate(canvas.width / 2, canvas.height / 2);
  c.lineWidth = 2;
  c.setLineDash([2, 2]);
  for (let i = 0; i < 100; i++) {
    c.beginPath();
    let xy = indexToXY(100, i);
    c.moveTo(80 * xy.x, 80 * xy.y);
    c.lineTo(
      (82 + (buffer[i] / 255) * 100) * xy.x,
      (82 + (buffer[i] / 255) * 100) * xy.y
    );
    c.stroke();
    c.closePath();
  }
  c.restore();
}

function indexToXY(slices, index) {
  const rad = ((Math.PI * 2) / slices) * index;
  return {
    x: Math.cos(rad),
    y: Math.sin(rad),
  };
}

function animate() {
  context.fft.getByteFrequencyData(context.buffer);
  drawFFT(canvas, context.buffer);
  animation = window.requestAnimationFrame(animate);
}

uploadBox.addEventListener("change", (event) => {
  if (!context) {
    context = setupAudio(audioElement);
  }
  audioElement.pause();
  audioElement.currentTime = 0;
  const file = uploadBox.files[0];
  if (file?.type === "audio/mpeg") {
    playAudioFile(file, audioElement);
    animation = window.requestAnimationFrame(animate);
  } else {
    window.cancelAnimationFrame(animation);
    animation = null;
  }
});
