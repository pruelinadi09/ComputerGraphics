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

//======== view rotation ========

let zoom = 1;

//======== camera rotation ========
let yaw = 0;
let pitch = 0;
let cameraPos = [0, 2, 6];  // Start behind and slightly above
let cameraFront = [0, 0, -1];
let cameraUp = [0, 1, 0];

function main()
{
    const canvas = document.getElementById("glcanvas");
    const gl = canvas.getContext("webgl");
    if (!gl)
    {
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

    // Mouse control for camera
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.onclick = () => canvas.requestPointerLock();
    document.addEventListener("pointerlockchange", lockChangeAlert, false);

    function lockChangeAlert() {
        if (document.pointerLockElement === canvas) {
            document.addEventListener("mousemove", updateCamera, false);
        } else {
            document.removeEventListener("mousemove", updateCamera, false);
        }
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "+" || e.key === "=") {
            zoom = Math.max(0.1, zoom - 0.1); // zoom in
        } else if (e.key === "-") {
            zoom = Math.min(5.0, zoom + 0.1); // zoom out
        }
        render();
    });

    function updateCamera(e) {
        const sensitivity = 0.002;
        yaw += e.movementX * sensitivity;
        pitch -= e.movementY * sensitivity;

        // Clamp pitch
        if (pitch > Math.PI / 2) pitch = Math.PI / 2;
        if (pitch < -Math.PI / 2) pitch = -Math.PI / 2;

        cameraFront = [
            Math.cos(pitch) * Math.sin(yaw),
            Math.sin(pitch),
            -Math.cos(pitch) * Math.cos(yaw)
        ];
    }

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

    function render() {
        gl.clearColor(0, 0, 0, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const view = mat4.create();
        const zoomedCameraPos = [
            cameraPos[0] * zoom,
            cameraPos[1] * zoom,
            cameraPos[2] * zoom,
        ];
        const center = [
            cameraPos[0] + cameraFront[0],
            cameraPos[1] + cameraFront[1],
            cameraPos[2] + cameraFront[2]
        ];
        mat4.lookAt(view, zoomedCameraPos, center, cameraUp);

        const lightPos = [2, 4, 2];

        // Draw light
        const lightMat = mat4.clone(view);
        mat4.translate(lightMat, lightMat, lightPos);
        mat4.scale(lightMat, lightMat, [0.1, 0.1, 0.1]);
        drawCube(gl, lightMat, lightPos);

        // Draw 3x3 ground cubes
        const spacing = 5;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const cubeMat = mat4.clone(view);
                mat4.translate(cubeMat, cubeMat, [i * spacing, -1, j * spacing]);
                mat4.scale(cubeMat, cubeMat, [1, 0.2, 1]);
                drawCube(gl, cubeMat, lightPos);
            }
        }

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
main();