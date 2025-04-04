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
    leftShoulder: createCircleVertices(-0.15, 0.2, 0.06),
    rightShoulder: createCircleVertices(0.15, 0.2, 0.06)
};

const positions = [].concat(
    robotParts.body,
    robotParts.head,
    robotParts.leftArm,
    robotParts.rightArm,
    robotParts.leftLeg,
    robotParts.rightLeg,
    robotParts.leftShoulder,
    robotParts.rightShoulder
);

gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

const colorLocation = gl.getUniformLocation(program, "u_color");
const matrixLocation = gl.getUniformLocation(program, "u_matrix");

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    const matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    gl.uniformMatrix3fv(matrixLocation, false, matrix);

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
    drawPart(robotParts.leftShoulder.length / 2, [1.0, 1.0, 0.0, 1.0]); // Left Shoulder (circle)
    drawPart(robotParts.rightShoulder.length / 2, [1.0, 1.0, 0.0, 1.0]); // Right Shoulder (circle)
}


gl.clearColor(0.0, 0.0, 0.0, 1.0);
drawScene();