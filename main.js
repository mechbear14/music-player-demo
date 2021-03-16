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
uniform sampler2D u_texture;

out vec4 outColour;

void main(){
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  float index = floor(st.x * 100.0);
  float localX = fract(st.x * 100.0) - 0.5;
  float localY = (st.y - 0.3) / (1.0 - 0.3);
  float amplitude = texture(u_texture, vec2(index / 512.0, 0.5)).x;

  vec4 background = vec4(0.0);
  vec4 white = vec4(1.0);
  float selector = smoothstep(0.3, 0.2, abs(localX)) * smoothstep(amplitude + 0.05, amplitude, abs(localY));
  float globalMult = min(max(0.5 * pow(localY + 1.0, 4.0), step(0.0, localY)), 1.0);
  outColour = mix(background, white, selector * globalMult);
}
`;

const drawContext = setupDraw(canvas, vertexShaderCode, fragmentShaderCode);

function setupAudio(audioElement) {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaElementSource(audioElement);
  const fft = audioContext.createAnalyser();
  fft.fftSize = 1024; // Fast Fourier Transform
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
  const textureType = gl.TEXTURE_2D;
  const level = 0;
  const format = gl.LUMINANCE;
  const width = 512;
  const height = 1;
  const border = 0;
  const type = gl.UNSIGNED_BYTE;
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    textureType,
    level,
    format,
    width,
    height,
    border,
    format,
    type,
    buffer
  );
  gl.generateMipmap(gl.TEXTURE_2D);
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
