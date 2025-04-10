const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL not supported");
}

const vsSource = `
    attribute vec2 a_position;
    uniform mat3 u_matrix;
    void main() {
        vec3 pos = u_matrix * vec3(a_position, 1.0);
        gl_Position = vec4(pos.xy, 0, 1);
    }
`;

const fsSource = `
    precision mediump float;
    uniform vec4 u_color;
    void main() {
        gl_FragColor = u_color;
    }
`;

function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error: ", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = compileShader(gl, vsSource, gl.VERTEX_SHADER);
const fragmentShader = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error: ", gl.getProgramInfoLog(program));
}

gl.useProgram(program);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

function createCircleVertices(cx, cy, r, segments = 24) {
    const vertices = [];
    for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * 2 * Math.PI;
        const angle2 = ((i + 1) / segments) * 2 * Math.PI;
        vertices.push(
            cx, cy,
            cx + r * Math.cos(angle1), cy + r * Math.sin(angle1),
            cx + r * Math.cos(angle2), cy + r * Math.sin(angle2)
        );
    }
    return vertices;
}

//==================== robot =========================
const robotParts = {
    body: [
        -0.1, -0.3,  0.1, -0.3,  0.1, 0.3,
        -0.1, -0.3,  0.1, 0.3,  -0.1, 0.3,
    ],
    head: [
        0.0, 0.55,  -0.1, 0.35,  0.1, 0.35
    ],
    leftArm: [
        -0.2, 0.2, -0.1, 0.2, -0.1, -0.2,
        -0.2, 0.2, -0.1, -0.2, -0.2, -0.2,
    ],
    rightArm: [
        0.1, 0.2, 0.2, 0.2, 0.2, -0.2,
        0.1, 0.2, 0.2, -0.2, 0.1, -0.2,
    ],
    leftLeg: [
        -0.07, -0.3, -0.02, -0.3, -0.02, -0.5,
        -0.07, -0.3, -0.02, -0.5, -0.07, -0.5,
    ],
    rightLeg: [
        0.02, -0.3, 0.07, -0.3, 0.07, -0.5,
        0.02, -0.3, 0.07, -0.5, 0.02, -0.5,
    ],
    leftHand: createCircleVertices(0.15, -0.19, 0.05),
    rightHand: createCircleVertices(-0.15, -0.19, 0.05)
};

const positions = [].concat(
    robotParts.body,
    robotParts.head,
    robotParts.leftArm,
    robotParts.rightArm,
    robotParts.leftLeg,
    robotParts.rightLeg,
    robotParts.rightHand,
    robotParts.leftHand
);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

//==================== fishing rod =========================
function createRodSegment(length = 0.3, thickness = 0.02) {
    return [
        0, 0,
        length, 0,
        length, thickness,
        0, 0,
        length, thickness,
        0, thickness
    ];
}

const rod = {
    segment1: createRodSegment(),
    joint1: createCircleVertices(0, 0.01, 0.03),
    segment2: createRodSegment(),
    joint2: createCircleVertices(0, 0.01, 0.03),
    segment3: createRodSegment()
};


//==================== draw =========================
function multiplyMatrix(a, b) {
    const result = [];
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            result[row * 3 + col] = 
                a[row * 3 + 0] * b[0 * 3 + col] +
                a[row * 3 + 1] * b[1 * 3 + col] +
                a[row * 3 + 2] * b[2 * 3 + col];
        }
    }
    return result;
}
const positionLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

const colorLocation = gl.getUniformLocation(program, "u_color");
const matrixLocation = gl.getUniformLocation(program, "u_matrix");

let offsetX = 0, offsetY = 0, scale = 1;
let rodAngles = [0, 0, 0];

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    const baseMatrix = [
        scale, 0, 0,
        0, scale, 0,
        offsetX, offsetY, 1
    ];
    gl.uniformMatrix3fv(matrixLocation, false, baseMatrix);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    let partCount = 0;

    function drawPart(count, color) {
        gl.uniform4fv(colorLocation, color);
        gl.drawArrays(gl.TRIANGLES, partCount, count);
        partCount += count;
    }

    drawPart(6, [0.0, 0.5, 1.0, 1.0]); // Body
    drawPart(3, [1.0, 0.8, 0.6, 1.0]); // Head
    drawPart(6, [0.8, 0.2, 0.2, 1.0]); // Left Arm
    drawPart(6, [0.8, 0.2, 0.2, 1.0]); // Right Arm
    drawPart(6, [0.2, 0.8, 0.2, 1.0]); // Left Leg
    drawPart(6, [0.2, 0.8, 0.2, 1.0]); // Right Leg
    drawPart(robotParts.rightHand.length / 2, [1.0, 1.0, 0.0, 1.0]);
    drawPart(robotParts.leftHand.length / 2, [1.0, 1.0, 0.0, 1.0]);

    //==================== draw rod=========================
    function drawRod() {
        function drawRodSegment(segment, matrix) {
            gl.uniformMatrix3fv(matrixLocation, false, matrix);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(segment), gl.STATIC_DRAW);
            gl.drawArrays(gl.TRIANGLES, 0, segment.length / 2);
        }

        function drawJoint(joint, matrix) {
            gl.uniformMatrix3fv(matrixLocation, false, matrix);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(joint), gl.STATIC_DRAW);
            gl.drawArrays(gl.TRIANGLES, 0, joint.length / 2);
        }

        // Base matrix near right hand
        let matrix = multiplyMatrix(baseMatrix, [
            1, 0, 0,
            0, 1, 0,
            0.07, -0.18, 1
        ]);
        let rotation = [
            Math.cos(rodAngles[0]), -Math.sin(rodAngles[0]), 0,
            Math.sin(rodAngles[0]),  Math.cos(rodAngles[0]), 0,
            0, 0, 1
        ];
        matrix = multiplyMatrix(matrix, rotation);
        drawRodSegment(rod.segment1, matrix);

        matrix = multiplyMatrix(matrix, [
            1, 0, 0,
            0, 1, 0,
            0.3, 0, 1
        ]);
        drawJoint(rod.joint1, matrix);

        matrix = multiplyMatrix(matrix, [
            Math.cos(rodAngles[1]), -Math.sin(rodAngles[1]), 0,
            Math.sin(rodAngles[1]),  Math.cos(rodAngles[1]), 0,
            0, 0, 1
        ]);
        drawRodSegment(rod.segment2, matrix);

        matrix = multiplyMatrix(matrix, [
            1, 0, 0,
            0, 1, 0,
            0.3, 0, 1
        ]);
        drawJoint(rod.joint2, matrix);

        matrix = multiplyMatrix(matrix, [
            Math.cos(rodAngles[2]), -Math.sin(rodAngles[2]), 0,
            Math.sin(rodAngles[2]),  Math.cos(rodAngles[2]), 0,
            0, 0, 1
        ]);
        drawRodSegment(rod.segment3, matrix);
    }
    drawRod();
}

gl.clearColor(0.0, 0.0, 0.0, 1.0);
drawScene();

// Control functions
function moveLeft() {
    offsetX -= 0.05;
    drawScene();
}
function moveRight() {
    offsetX += 0.05;
    drawScene();
}
function moveUp() {
    offsetY += 0.05;
    drawScene();
}
function moveDown() {
    offsetY -= 0.05;
    drawScene();
}
// function setScale(val) {
//     scale = parseFloat(val);
//     drawScene();
// }
function zoomIn() {
    scale *= 1.1;
    drawScene();
}

function zoomOut() {
    scale *= 0.9;
    drawScene();
}

function rotateRod(index, delta) {
    rodAngles[index] += delta;
    drawScene();
}