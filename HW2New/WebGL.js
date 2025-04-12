// WebGL.js
let canvas = document.getElementById("glcanvas");
let gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

if (!gl) {
  alert("WebGL not supported!");
}

let zoom = 1;
let robotX = 0;
let robotY = 0;
let jointAngles = [0, 0, 0];
let objectJointAngles = [0, 0];
let grabbed = false;

// Shaders
const vertexShaderSource = `
  attribute vec2 a_position;
  uniform vec2 u_resolution;
  uniform mat3 u_matrix;

  void main() {
    vec2 position = (u_matrix * vec3(a_position, 1)).xy;
    vec2 clipSpace = ((position / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
    gl_Position = vec4(clipSpace, 0, 1);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec4 u_color;
  void main() {
    gl_FragColor = u_color;
  }
`;

function createShader(gl, type, source) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function createProgram(gl, vs, fs) {
  let program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return program;
}

let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
let program = createProgram(gl, vertexShader, fragmentShader);

gl.useProgram(program);

let positionLocation = gl.getAttribLocation(program, "a_position");
let resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
let colorUniformLocation = gl.getUniformLocation(program, "u_color");
let matrixLocation = gl.getUniformLocation(program, "u_matrix");

let positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

function setRectangle(x, y, width, height) {
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    x, y,
    x + width, y,
    x, y + height,
    x, y + height,
    x + width, y,
    x + width, y + height,
  ]), gl.STATIC_DRAW);
}

function drawRectangle(x, y, width, height, color, matrix) {
  setRectangle(x, y, width, height);
  gl.uniform4fv(colorUniformLocation, color);
  gl.uniformMatrix3fv(matrixLocation, false, matrix);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawCircle(radius, segments, color, matrix) {
    let angleStep = (Math.PI * 2) / segments;
    let vertices = [];
    for (let i = 0; i <= segments; ++i) {
      let angle = i * angleStep;
      vertices.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    let circleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.uniform4fv(colorUniformLocation, color);
    gl.uniformMatrix3fv(matrixLocation, false, matrix);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, segments + 1);
  }

  function drawTriangle(vertices, color, matrix) {
    let triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.uniform4fv(colorUniformLocation, color);
    gl.uniformMatrix3fv(matrixLocation, false, matrix);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

function translationMatrix(tx, ty) {
  return [
    1, 0, 0,
    0, 1, 0,
    tx*zoom, ty*zoom, 1,
  ];
}

function rotationMatrix(angleInRadians) {
  let c = Math.cos(angleInRadians);
  let s = Math.sin(angleInRadians);
  return [
    c, -s, 0,
    s,  c, 0,
    0,  0, 1,
  ];
}

function scalingMatrix(sx, sy) {
  return [
    sx, 0, 0,
    0, sy, 0,
    0, 0, 1,
  ];
}

function multiplyMatrices(a, b) {
  let out = [];
  for (let i = 0; i < 3; ++i) {
    for (let j = 0; j < 3; ++j) {
      out[i * 3 + j] = 0;
      for (let k = 0; k < 3; ++k) {
        out[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
      }
    }
  }
  return out;
}

function drawScene() {
  gl.clearColor(0.95, 0.95, 0.95, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enableVertexAttribArray(positionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

  let baseMatrix = multiplyMatrices(
    scalingMatrix(zoom, zoom),
    translationMatrix(robotX + canvas.width / 2, robotY + canvas.height / 2)
  );

  drawRectangle(-20, 0, 40, 100, [0.1, 0.6, 0.9, 1], baseMatrix); // torso
  let headMatrix = multiplyMatrices(baseMatrix, translationMatrix(0, -30));
  drawCircle(25, 30, [0.9, 0.6, 0.9, 1], headMatrix);
  // Add a triangle hat on the head
  let hatMatrix = multiplyMatrices(headMatrix, translationMatrix(0, -25));
  drawTriangle([
    0, -40,
    -30, 0,
    30, 0
  ], [0.3, 0.1, 0.6, 1], hatMatrix);
  let leftArmMatrix = multiplyMatrices(baseMatrix, translationMatrix(-25, 0));
  drawRectangle(-10, 0, 15, 55, [0.8, 0.2, 0.2, 1], leftArmMatrix);

  let rightArmMatrix = multiplyMatrices(baseMatrix, translationMatrix(15, 0));
  if (grabbed) {
    drawRectangle(5, 0, 55, 15, [0.8, 0.2, 0.2, 1], rightArmMatrix);
  }
  else {
    drawRectangle(5, 0, 15, 55, [0.8, 0.2, 0.2, 1], rightArmMatrix);
  }

  let leftLegMatrix = multiplyMatrices(baseMatrix, translationMatrix(-10, 60));
  drawRectangle(-5, 50, 13, 40, [0.2, 0.2, 0.8, 1], leftLegMatrix);
  let rightLegMatrix = multiplyMatrices(baseMatrix, translationMatrix(0, 60));
  drawRectangle(5, 50, 13, 40, [0.2, 0.2, 0.8, 1], rightLegMatrix);

  let grabX=0, grabY=0;
  if (grabbed) {
    grabX = 30;
    grabY = 40;
  }
  else {
    baseMatrix = multiplyMatrices(
        scalingMatrix(zoom, zoom),
        translationMatrix(canvas.width / 2, canvas.height / 2)
      );
  }
  
  // Joint 1
  let joint1Matrix = multiplyMatrices(baseMatrix, rotationMatrix(jointAngles[0] * Math.PI / 180));;
  drawRectangle(100-grabX, -175+grabY, 15, 80, [0.2, 0.8, 0.4, 1], joint1Matrix);

  // Joint 2
  let joint2Matrix = multiplyMatrices(joint1Matrix, translationMatrix(0, 80));
  joint2Matrix = multiplyMatrices(joint2Matrix, rotationMatrix(jointAngles[1] * Math.PI / 180));
  drawRectangle(100-grabX, -160+grabY, 15, 80, [0.9, 0.6, 0.2, 1], joint2Matrix);

  // Joint 3
  let joint3Matrix = multiplyMatrices(joint2Matrix, translationMatrix(0, 60));
  joint3Matrix = multiplyMatrices(joint3Matrix, rotationMatrix(jointAngles[2] * Math.PI / 180));
  drawRectangle(100-grabX, -120+grabY, 15, 80, [0.6, 0.2, 0.8, 1], joint3Matrix);

  let objectBaseMatrix = multiplyMatrices(baseMatrix, translationMatrix(108 - grabX, -80 + grabY));
  drawCircle(15, 30, [0.9, 0.6, 0.9, 1], objectBaseMatrix);

  let objJointAMatrix = multiplyMatrices(objectBaseMatrix, translationMatrix(0, 90));
  drawCircle(15, 30, [0.9, 0.6, 0.9, 1], objJointAMatrix);
}

function isRobotWithinCanvas(x, y) {
    const margin = 50; // adjust based on how large the robot is
    const canvasWidth = gl.canvas.width;
    const canvasHeight = gl.canvas.height;
  
    return (
      x > margin &&
      x < canvasWidth - margin &&
      y > margin &&
      y < canvasHeight - margin
    );
}  

function setupUI() {
  document.getElementById("robotX").oninput = e => { robotX = parseInt(e.target.value); drawScene(); };
  document.getElementById("robotY").oninput = e => { robotY = parseInt(e.target.value); drawScene(); };
  document.getElementById("joint1").oninput = e => { jointAngles[0] = parseInt(e.target.value); drawScene(); };
  document.getElementById("joint2").oninput = e => { jointAngles[1] = parseInt(e.target.value); drawScene(); };
  document.getElementById("joint3").oninput = e => { jointAngles[2] = parseInt(e.target.value); drawScene(); };
  document.getElementById("grabBtn").onclick = () => { grabbed = true; drawScene(); };
  document.getElementById("releaseBtn").onclick = () => { grabbed = false; drawScene(); };
  document.getElementById("zoomIn").onclick = () => { zoom *= 1.1; drawScene(); };
  document.getElementById("zoomOut").onclick = () => { zoom *= 0.9; drawScene(); };
}

setupUI();
drawScene();