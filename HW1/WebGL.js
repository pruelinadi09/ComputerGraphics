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
