const vertexShaderSrc = `
attribute vec4 aPosition;
attribute vec3 aNormal;
attribute vec2 a_TexCoord;
varying vec2 v_TexCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

uniform vec3 uLightPosition;

varying vec3 vLighting;

void main(void) {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;
    v_TexCoord = a_TexCoord;

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
uniform vec3 uColor;
varying vec2 v_TexCoord;
uniform sampler2D uSampler;

void main(void) {
    vec4 texColor = texture2D(uSampler, v_TexCoord);
    gl_FragColor = vec4(uColor * vLighting, texColor.a);
}
`;

const rainVertexShaderSrc = `
attribute vec3 aPosition;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
    gl_PointSize = 2.0;
}
`;
const rainFragmentShaderSrc = `
precision mediump float;
uniform vec3 uColor;

void main() {
    gl_FragColor = vec4(uColor, 1.0);
}

`;

//======== view rotation ========

let zoom = 1;

//======== camera rotation ========
let yaw = 0;
let pitch = 0;
let cameraPos = [0, 0.5, 4];  // Start behind and slightly above
let cameraFront = [0, 0, -1];
let cameraUp = [0, 1, 0];

//======== camera movement ========
let velocityY = 0;
let isJumping = false;
let moveForward = false;
let groundY = 0;  // base Y position of camera when on the ground
let gravity = -0.01;
let jumpStrength = 0.4;
let jumpVelocity = 0;

let keys = {};

let hasFallen = false;
let isFirstPersonView = true;

//======== rain background ========
let rainParticles = [];
let rainCount = 1000;


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
    const uColor = gl.getUniformLocation(program, 'uColor');

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

    document.addEventListener("keydown", (e) => {
        keys[e.key.toLowerCase()] = true;

        if (e.key === " " && !isJumping) {
            velocityY = jumpStrength;
            isJumping = true;
        }
        if (e.key === "w" || e.key === "ArrowUp") {
            moveForward = true;
        }
    });

    document.addEventListener("keyup", (e) => {
        keys[e.key.toLowerCase()] = false;
        if (e.key === "w" || e.key === "ArrowUp") {
            moveForward = false;
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'v' || e.key === 'V') {
            isFirstPersonView = !isFirstPersonView;
            // console.log('Perspective changed:', isFirstPersonView ? 'First Person' : 'Third Person');
        }
    });



    function updateCamera(e) {
        const sensitivity = 0.002;
        yaw += e.movementX * sensitivity;
        pitch -= e.movementY * sensitivity;

        // Clamp pitch
        if (pitch > Math.PI / 2) pitch = Math.PI / 2;
        if (pitch < -Math.PI / 2) pitch = -Math.PI / 2;

        const front = [
            Math.cos(pitch) * Math.sin(yaw),
            Math.sin(pitch),
            -Math.cos(pitch) * Math.cos(yaw)
        ];
        const length = Math.hypot(front[0], front[1], front[2]);
        cameraFront = front.map(c => c / length);
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
        gl.uniform3fv(uColor, [1, 1, 1]);

        gl.bindBuffer(gl.ARRAY_BUFFER, cube.vbo);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 24, 12);
        gl.enableVertexAttribArray(aNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.ebo);
        gl.drawElements(gl.TRIANGLES, cube.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    function drawArielCharacter(gl, baseMat, lightPos, view) {
        const torso = mat4.clone(baseMat);
        mat4.translate(torso, torso, [0, 1.0, 0]);  // move torso up
        mat4.scale(torso, torso, [0.4, 0.6, 0.2]);  // scale to torso shape
        drawColoredCube(gl, torso, lightPos, [1.0, 0.5, 0.6], view, cube); // pinkish skin tone

        const hair = mat4.clone(baseMat);
        mat4.translate(hair, hair, [0, 1.6, 0]); // head level
        mat4.scale(hair, hair, [0.5, 0.4, 0.4]);
        drawColoredCube(gl, hair, lightPos, [1.0, 0.0, 0.4], view, cube); // Ariel's red hair

        const tail = mat4.clone(baseMat);
        mat4.translate(tail, tail, [0, -0.5, 0]);
        mat4.scale(tail, tail, [0.4, 0.5, 0.2]);
        drawColoredCube(gl, tail, lightPos, [0.0, 0.8, 0.6], view, cube); // green tail
    }

    function drawColoredCube(gl, modelMatrix, lightPos, color, viewMatrix, cube) {
        gl.useProgram(program);

        const modelViewMatrix = mat4.create();
        mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelViewMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModelViewMatrix'), false, modelViewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, projectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uNormalMatrix'), false, normalMatrix);
        gl.uniform3fv(gl.getUniformLocation(program, 'uLightPosition'), lightPos);
        gl.uniform3fv(gl.getUniformLocation(program, 'uColor'), color);

        // Bind VBO
        gl.bindBuffer(gl.ARRAY_BUFFER, cube.vbo);
        const a_Position = gl.getAttribLocation(program, 'aPosition');
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // Bind normals
        const a_Normal = gl.getAttribLocation(program, 'aNormal');
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        // Bind EBO and draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.ebo);
        gl.drawElements(gl.TRIANGLES, cube.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    //rain
    const rainVS = compileShader(gl, rainVertexShaderSrc, gl.VERTEX_SHADER);
    const rainFS = compileShader(gl, rainFragmentShaderSrc, gl.FRAGMENT_SHADER);
    const rainProgram = createProgram(gl, rainVS, rainFS);

    for (let i = 0; i < rainCount; i++) {
        rainParticles.push({
            x: (Math.random() - 0.5) * 50,
            y: Math.random() * 50,
            z: (Math.random() - 0.5) * 50,
            speed: 0.1 + Math.random() * 0.2
        });
    }
    function updateRain() {
        for (let drop of rainParticles) {
            drop.y -= drop.speed;
            if (drop.y < 0) {
                drop.y = 50;
            }
        }
    }

    const rainPositions = new Float32Array(rainParticles.length * 3);

    function renderRain(viewMatrix) {
        gl.useProgram(rainProgram);

        const uModelViewMatrix = gl.getUniformLocation(rainProgram, "uModelViewMatrix");
        const uProjectionMatrix = gl.getUniformLocation(rainProgram, "uProjectionMatrix");
        const uColor = gl.getUniformLocation(rainProgram, "uColor");

        for (let i = 0; i < rainParticles.length; i++) {
            const p = rainParticles[i];
            rainPositions[i * 3] = p.x;
            rainPositions[i * 3 + 1] = p.y;
            rainPositions[i * 3 + 2] = p.z;
        }

        const rainBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, rainBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, rainPositions, gl.DYNAMIC_DRAW);

        const a_Position = gl.getAttribLocation(rainProgram, "aPosition");
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        gl.depthMask(false);
        gl.disable(gl.DEPTH_TEST);  

        gl.uniformMatrix4fv(gl.getUniformLocation(rainProgram, "uModelViewMatrix"), false, viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(rainProgram, "uProjectionMatrix"), false, projectionMatrix);
        gl.uniform3fv(uColor, [0.5, 0.5, 1]);

        gl.drawArrays(gl.POINTS, 0, rainParticles.length);
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
    }


    function render() {
        if (hasFallen) {
            if (!window._gameOverShown) {
                alert("Game Over! You fell.");
                window._gameOverShown = true;
            }
            return;
        }

        gl.clearColor(0, 0, 0, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (isFirstPersonView) {
            // Movement forward
            if (moveForward) {
                const speed = isJumping ? 0.15 : 0.05;
                cameraPos[0] += cameraFront[0] * speed;
                cameraPos[2] += cameraFront[2] * speed;
            }

            // Jumping mechanics
            if (isJumping) {
                jumpVelocity += gravity;
                cameraPos[1] += jumpVelocity;
                if (cameraPos[1] <= 0) {
                    cameraPos[1] = 0;
                    isJumping = false;
                    jumpVelocity = 0;
                }
            }
        }
        // Check if player is standing on any cube
        if (!isPlayerOnAnyCube(cameraPos[0], cameraPos[2]) && !isJumping) {
            hasFallen = true;
        }

        const lightPos = [2, 4, 2];
        const view = mat4.create();

        if (isFirstPersonView) {
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
        } else {
            // Fixed third-person camera view
            const thirdPersonCamPos = [0, 10, 10];
            const target = [0, 0, 0];
            mat4.lookAt(view, thirdPersonCamPos, target, cameraUp);

            const characterMat = mat4.create();
            mat4.translate(characterMat, characterMat, cameraPos);
            mat4.scale(characterMat, characterMat, [0.5, 1, 0.5]); // scale to human-ish size

            drawArielCharacter(gl, characterMat, lightPos, view);
        }

        // 🚨 RENDER RAIN FIRST
        updateRain();
        renderRain(view);
        gl.useProgram(program);

        // Draw light
        const lightMat = mat4.clone(view);
        mat4.translate(lightMat, lightMat, lightPos);
        mat4.scale(lightMat, lightMat, [0.1, 0.1, 0.1]);
        drawCube(gl, lightMat, lightPos);

        // Draw 3x3 ground cubes
        const spacing = 4;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const cubeMat = mat4.clone(view);
                mat4.translate(cubeMat, cubeMat, [i * spacing, -1, j * spacing]);
                mat4.scale(cubeMat, cubeMat, [1, 0.2, 1]);
                drawCube(gl, cubeMat, lightPos);
            }
        }

        // Apply gravity and jumping
        cameraPos[1] += velocityY;
        velocityY += gravity;

        // Clamp to ground
        if (cameraPos[1] <= groundY) {
            cameraPos[1] = groundY;
            velocityY = 0;
            isJumping = false;
        }

        // console.log(cameraPos[0], cameraPos[1], cameraPos[2]);
        // console.log(isJumping);

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

function isPlayerOnAnyCube(cameraX, cameraZ) {
    const spacing = 4;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const centerX = i * spacing;
            const centerZ = j * spacing;
            const halfSize = 1.5;

            if (
                cameraX > centerX - halfSize && cameraX <= centerX + halfSize &&
                cameraZ > centerZ - halfSize && cameraZ <= centerZ + halfSize
            ) {
                return true;
            }
        }
    }
    return false;
}

main();