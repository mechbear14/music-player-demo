const uploadBox = document.getElementById("upload");
const audioElement = document.getElementById("audio");
const canvas = document.getElementById("canvas");
let context = null;
let animation = null;

const vertexShaderCode = `#version 300 es
in vec2 a_position;

void main(){
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderCode = `#version 300 es
precision mediump float;

uniform vec2 u_resolution;

out vec4 outColour;

void main(){
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  st = st * 2.0 - 1.0;
  st.x *= u_resolution.x / u_resolution.y;
  vec4 c = vec4(1.0, 0.5, 0.0, 1.0);
  vec4 w = vec4(1.0, 1.0, 1.0, 1.0);
  float circle = smoothstep(0.2, 0.3, dot(st, st));
  vec4 colour = mix(c, w, circle);
  outColour = colour;
}
`;

const drawContext = setupDraw(canvas, vertexShaderCode, fragmentShaderCode);

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

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
  console.error(gl.getProgramInfoLog(program));
  gl.createProgram(program);
}

function setupDraw(canvas, vertexShaderCode, fragmentShaderCode) {
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    alert("Roar! No WebGL2 for you!");
    return;
  }
  const positions = [-1, -1, -1, 1, 1, -1, 1, 1];
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderCode);
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderCode
  );
  const program = createProgram(gl, vertexShader, fragmentShader);
  const positionLocation = gl.getAttribLocation(program, "a_position");
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const vertexArray = gl.createVertexArray();
  gl.bindVertexArray(vertexArray);
  gl.enableVertexAttribArray(positionLocation);
  const size = 2;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;
  gl.vertexAttribPointer(
    positionLocation,
    size,
    type,
    normalize,
    stride,
    offset
  );
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  return { gl, vertexArray, program };
}

function resize(context, size) {
  const { gl, program } = context;
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  gl.uniform2f(resolutionLocation, size.x, size.y);
}

function drawFFT(context, buffer) {
  const { gl, vertexArray, program } = context;
  const primitiveType = gl.TRIANGLE_STRIP;
  const offset = 0;
  const count = 4;
  gl.bindVertexArray(vertexArray);
  gl.useProgram(program);
  resize(drawContext, { x: 640, y: 360 });
  gl.drawArrays(primitiveType, offset, count);
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
  drawFFT(drawContext, context.buffer);
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
