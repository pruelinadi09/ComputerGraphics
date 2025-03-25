//This tempalte is just for your reference
//You do not have to follow this template 
//You are very welcome to write your program from scratch

//shader
var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    varying vec4 v_Color;
    void main() {
        gl_Position = a_Position;
        v_Color = a_Color;
    }
`;
var FSHADER_SOURCE = `
    precision mediump float;
    varying vec4 v_Color;
    void main() {
        gl_FragColor = v_Color;
    }
`;


var shapeFlag = 'p'; //p: point, h: hori line: v: verti line, t: triangle, q: square, c: circle
var colorFlag = 'r'; //r g b 
var g_points = [];
var g_horiLines = [];
var g_vertiLines = [];
var g_triangles = [];
var g_squares = [];
var g_circles = [];
//var ... of course you may need more variables
var gl, canvas, a_Position, a_Color, u_FragColor;
var shapes = {
    p: [], h: [], v: [], t: [], q: [], c: []
};
var colors = {
    r: [1.0, 0.0, 0.0, 1.0],
    g: [0.0, 1.0, 0.0, 1.0],
    b: [0.0, 0.0, 1.0, 1.0]
};


function main(){
    //////Get the canvas context
    var canvas = document.getElementById('webgl');
    //var gl = canvas.getContext('webgl') || canvas.getContext('exprimental-webgl') ;
    var gl = canvas.getContext('webgl2');
    if(!gl){
        console.log('Failed to get the rendering context for WebGL');
        return ;
    }

    // compile shader and use program
    var program = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    gl.useProgram(program);

    a_Position = gl.getAttribLocation(program, 'a_Position');
    a_Color = gl.getAttribLocation(program, 'a_Color');

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // mouse and key event...
    canvas.onmousedown = function(ev){click(ev)};
    document.onkeydown = function(ev){keydown(ev)};
    draw();
}



function keydown(ev){ //you may want to define more arguments for this function
    //implment keydown event here
    let key = ev.key.toLowerCase();
    if ('phtqvc'.includes(key)) shapeFlag = key;
    if ('rgb'.includes(key)) colorFlag = key;
}

function click(ev){ //you may want to define more arguments for this function
    //mouse click: recall our quiz1 in calss
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.height/2)/(canvas.height/2)
    y = (canvas.width/2 - (y - rect.top))/(canvas.height/2)

    //you might want to do something here
    var color = colors[colorFlag];

    if (shapes[shapeFlag].length >= 5) shapes[shapeFlag].shift();

    switch (shapeFlag) {
        case 'p':
            shapes.p.push({ x, y, color });
            break;
        case 'h':
            shapes.h.push({ x1: -0.1 + x, x2: 0.1 + x, y, color });
            break;
        case 'v':
            shapes.v.push({ x, y1: y - 0.1, y2: y + 0.1, color });
            break;
        case 't':
            shapes.t.push({ x, y, color });
            break;
        case 'q':
            shapes.q.push({ x, y, color });
            break;
        case 'c':
            shapes.c.push({ x, y, color });
            break;
    }

    //self-define draw() function
    //I suggest that you can clear the canvas
    //and redraw whole frame(canvas) after any mouse click
    draw();
}


function draw(){ //you may want to define more arguments for this function
    //redraw whole canvas here
    //Note: you are only allowed to same shapes of this frame by single gl.drawArrays() call
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawShapes(shapes.p, drawPoints);
    drawShapes(shapes.h, drawHorizontalLines);
    drawShapes(shapes.v, drawVerticalLines);
    drawShapes(shapes.t, drawTriangles);
    drawShapes(shapes.q, drawSquares);
    drawShapes(shapes.c, drawCircles);
}

function drawShapes(shapeList, drawFunc) {
    if (shapeList.length > 0) drawFunc(shapeList);
}

function drawPoints(points) {
    let vertices = [];
    let colors = [];
    points.forEach(p => {
        vertices.push(p.x, p.y);
        colors.push(...p.color);
    });

    drawArrays(vertices, colors, gl.POINTS);
}

function drawHorizontalLines(lines) {
    let vertices = [];
    let colors = [];
    lines.forEach(l => {
        vertices.push(l.x1, l.y, l.x2, l.y);
        colors.push(...l.color, ...l.color);
    });

    drawArrays(vertices, colors, gl.LINES);
}

function drawVerticalLines(lines) {
    let vertices = [];
    let colors = [];
    lines.forEach(l => {
        vertices.push(l.x, l.y1, l.x, l.y2);
        colors.push(...l.color, ...l.color);
    });

    drawArrays(vertices, colors, gl.LINES);
}

function drawTriangles(triangles) {
    let vertices = [];
    let colors = [];
    triangles.forEach(t => {
        let size = 0.05;
        vertices.push(
            t.x, t.y + size,
            t.x - size, t.y - size,
            t.x + size, t.y - size
        );
        colors.push(...t.color, ...t.color, ...t.color);
    });

    drawArrays(vertices, colors, gl.TRIANGLES);
}

function drawSquares(squares) {
    let vertices = [];
    let colors = [];
    squares.forEach(q => {
        let size = 0.05;
        vertices.push(
            q.x - size, q.y - size,
            q.x + size, q.y - size,
            q.x + size, q.y + size,
            q.x - size, q.y - size,
            q.x + size, q.y + size,
            q.x - size, q.y + size
        );
        colors.push(...q.color, ...q.color, ...q.color, ...q.color, ...q.color, ...q.color);
    });

    drawArrays(vertices, colors, gl.TRIANGLES);
}

function drawCircles(circles) {
    let vertices = [];
    let colors = [];
    let numSegments = 20;
    let angleStep = (2 * Math.PI) / numSegments;

    circles.forEach(c => {
        for (let i = 0; i < numSegments; i++) {
            let angle1 = i * angleStep;
            let angle2 = (i + 1) * angleStep;
            let size = 0.05;

            let x1 = c.x + Math.cos(angle1) * size;
            let y1 = c.y + Math.sin(angle1) * size;
            let x2 = c.x + Math.cos(angle2) * size;
            let y2 = c.y + Math.sin(angle2) * size;

            vertices.push(c.x, c.y, x1, y1, x2, y2);
            colors.push(...c.color, ...c.color, ...c.color);
        }
    });

    drawArrays(vertices, colors, gl.TRIANGLES);
}

function drawArrays(vertices, colors, mode) {
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    let colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Color);

    gl.drawArrays(mode, 0, vertices.length / 2);
}

function createProgram(gl, vShaderSrc, fShaderSrc) {
    var vShader = loadShader(gl, gl.VERTEX_SHADER, vShaderSrc);
    var fShader = loadShader(gl, gl.FRAGMENT_SHADER, fShaderSrc);
    var program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    return program;
}

function loadShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}
