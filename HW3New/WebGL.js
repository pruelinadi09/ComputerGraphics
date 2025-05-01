const vertexShaderSrc = `
attribute vec4 aPosition;
attribute vec3 aNormal;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

uniform vec3 uLightPosition;

varying vec3 vLighting;

void main(void) {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;

    vec3 ambientLight = vec3(0.2, 0.2, 0.2);
    vec3 directionalLightColor = vec3(1, 1, 1);
    
    vec3 transformedNormal = normalize(vec3(uNormalMatrix * vec4(aNormal, 1.0)));
    vec4 vertexPosition = uModelViewMatrix * aPosition;
    vec3 lightDirection = normalize(uLightPosition - vec3(vertexPosition.xyz));

    float diff = max(dot(transformedNormal, lightDirection), 0.0);
    vLighting = ambientLight + (directionalLightColor * diff);
}
`;

const fragmentShaderSrc = `
precision mediump float;
varying vec3 vLighting;

void main(void) {
    gl_FragColor = vec4(vLighting, 1.0);
}
`;

let carX = 0;
let carY = 0;
let zoom = 1;
let joint1Angle = 0;
let joint2Angle = 0;
let joint3Angle = 0;

function main() {
    const canvas = document.getElementById("glcanvas");
    const gl = canvas.getContext("webgl");

    if (!gl) {
        alert("WebGL not supported");
        return;
    }

    // Compile shaders
    const vs = compileShader(gl, vertexShaderSrc, gl.VERTEX_SHADER);
    const fs = compileShader(gl, fragmentShaderSrc, gl.FRAGMENT_SHADER);
    const program = createProgram(gl, vs, fs);

    gl.useProgram(program);

    // Attributes and uniforms
    const aPosition = gl.getAttribLocation(program, "aPosition");
    const aNormal = gl.getAttribLocation(program, "aNormal");
    const uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");
    const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    const uNormalMatrix = gl.getUniformLocation(program, "uNormalMatrix");
    const uLightPosition = gl.getUniformLocation(program, "uLightPosition");

    // Perspective projection
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

    // Define cube
    const cube = createCube(gl);

    function drawCube(gl, transform, lightPos) {
        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, transform);
        mat4.transpose(normalMatrix, normalMatrix);

        gl.uniformMatrix4fv(uModelViewMatrix, false, transform);
        gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);
        gl.uniform3fv(uLightPosition, lightPos);

        gl.bindBuffer(gl.ARRAY_BUFFER, cube.vbo);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 24, 12);
        gl.enableVertexAttribArray(aNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.ebo);
        gl.drawElements(gl.TRIANGLES, cube.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    // Render scene
    function render() {
        gl.clearColor(0, 0, 0, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const view = mat4.create();
        mat4.lookAt(view, [0, 8, 35/zoom], [0, 0, 0], [0, 1, 0]);

        const lightPos = [2, 4, 2];

        // Draw point light source as a small cube
        const lightMat = mat4.clone(view);
        mat4.translate(lightMat, lightMat, lightPos);
        mat4.scale(lightMat, lightMat, [0.1, 0.1, 0.1]);
        drawCube(gl, lightMat, lightPos);

        // Ground
        const ground = mat4.clone(view);
        mat4.translate(ground, ground, [0, -1, 0]);
        mat4.scale(ground, ground, [10, 0.2, 10]);
        drawCube(gl, ground, lightPos);

        //================= Robot (3 parts connected) =================
        // Car base
        const carBase = mat4.clone(view);
        mat4.translate(carBase, carBase, [carX-3, 0, carY]);

        const carBody = mat4.clone(carBase);
        mat4.scale(carBody, carBody, [2, 1, 1]);
        drawCube(gl, carBody, lightPos);

        // Second base block
        const carBase2 = mat4.clone(carBase);
        mat4.translate(carBase2, carBase2, [0, 1.5, 0]);
        mat4.scale(carBase2, carBase2, [1.5, 1, 0.5]);
        drawCube(gl, carBase2, lightPos);

        // Joint 1 - Arm segment 1
        const joint1 = mat4.clone(carBase);
        mat4.translate(joint1, joint1, [1.7, 1.7, 0]);
        mat4.scale(joint1, joint1, [0.2, 0.2, 0.3]);
        mat4.rotateZ(joint1, joint1, joint1Angle);
        drawCube(gl,joint1, lightPos);

        const arm1 = mat4.clone(carBase);
        mat4.translate(arm1, arm1, [2.9, 1.7, 0]);
        mat4.scale(arm1, arm1, [1, 0.3, 0.3]);
        drawCube(gl, arm1, lightPos);

        // Joint 2 - Arm segment 2
        const joint2 = mat4.clone(joint1);
        mat4.translate(joint2, joint2, [12, 0, 0]);
        mat4.rotateZ(joint2, joint2, joint2Angle);
        drawCube(gl,joint2, lightPos);

        const arm2 = mat4.clone(arm1);
        mat4.translate(arm2, arm2, [2.4, 0, 0]);
        drawCube(gl, arm2, lightPos);

        // Joint 3 - Arm segment 3
        const joint3 = mat4.clone(joint2);
        mat4.translate(joint3, joint3, [12., 0, 0]);
        mat4.rotateZ(joint3, joint3, joint3Angle);
        drawCube(gl,joint3, lightPos);

        const arm3 = mat4.clone(arm2);
        mat4.translate(arm3, arm3, [2.3, 0, 0]);
        drawCube(gl, arm3, lightPos);

        //================= Object (3 parts connected) =================
        // const obj1 = mat4.clone(view);
        // mat4.translate(obj1, obj1, [3, 0.5, 0]);
        // mat4.scale(obj1, obj1, [1, 1, 1]);
        // drawCube(gl, obj1, lightPos);

        // const obj2 = mat4.clone(view);
        // mat4.translate(obj2, obj2, [3, 2, 0]);
        // mat4.scale(obj2, obj2, [0.7, 1, 0.5]);
        // drawCube(gl, obj2, lightPos);

        // const obj3 = mat4.clone(view);
        // mat4.translate(obj3, obj3, [3, 3.5, 0]);
        // mat4.scale(obj3, obj3, [0.5, 0.5, 0.5]);
        // drawCube(gl, obj3, lightPos);

        requestAnimationFrame(render);
    }

    render();
}

function compileShader(gl, src, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error("Shader compile error: " + gl.getShaderInfoLog(shader));
    return shader;
}

function createProgram(gl, vs, fs) {
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        throw new Error("Program link error: " + gl.getProgramInfoLog(prog));
    return prog;
}

function createCube(gl) {
    const positions = [
        // Front
        -1,-1, 1,  0, 0, 1,
         1,-1, 1,  0, 0, 1,
         1, 1, 1,  0, 0, 1,
        -1, 1, 1,  0, 0, 1,
        // Back
        -1,-1,-1,  0, 0,-1,
        -1, 1,-1,  0, 0,-1,
         1, 1,-1,  0, 0,-1,
         1,-1,-1,  0, 0,-1,
        // Top
        -1, 1,-1,  0, 1, 0,
        -1, 1, 1,  0, 1, 0,
         1, 1, 1,  0, 1, 0,
         1, 1,-1,  0, 1, 0,
        // Bottom
        -1,-1,-1,  0,-1, 0,
         1,-1,-1,  0,-1, 0,
         1,-1, 1,  0,-1, 0,
        -1,-1, 1,  0,-1, 0,
        // Right
         1,-1,-1,  1, 0, 0,
         1, 1,-1,  1, 0, 0,
         1, 1, 1,  1, 0, 0,
         1,-1, 1,  1, 0, 0,
        // Left
        -1,-1,-1, -1, 0, 0,
        -1,-1, 1, -1, 0, 0,
        -1, 1, 1, -1, 0, 0,
        -1, 1,-1, -1, 0, 0,
    ];

    const indices = [
         0,  1,  2,    0,  2,  3,  // front
         4,  5,  6,    4,  6,  7,  // back
         8,  9, 10,    8, 10, 11,  // top
        12, 13, 14,   12, 14, 15,  // bottom
        16, 17, 18,   16, 18, 19,  // right
        20, 21, 22,   20, 22, 23,  // left
    ];

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return { vbo, ebo, indices };
}

function setupUI() {
    document.getElementById("robotX").oninput = e => { carX = parseInt(e.target.value); main(); };
    document.getElementById("robotY").oninput = e => { carY = parseInt(e.target.value); main(); };
    document.getElementById("joint1").oninput = e => { jointAngles[0] = parseInt(e.target.value); main(); };
    document.getElementById("joint2").oninput = e => { jointAngles[1] = parseInt(e.target.value); main(); };
    document.getElementById("joint3").oninput = e => { jointAngles[2] = parseInt(e.target.value); main(); };
    document.getElementById("grabBtn").onclick = () => { grabbed = true; main(); };
    document.getElementById("releaseBtn").onclick = () => { grabbed = false; main(); };
    document.getElementById("zoomIn").onclick = () => { zoom *= 1.1; main(); };
    document.getElementById("zoomOut").onclick = () => { zoom *= 0.9; main(); };
}
  
setupUI();
main();
