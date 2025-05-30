var VSHADER_SOURCE = `
    uniform vec4 u_Position;
    void main(){
        gl_Position = u_Position;
        gl_PointSize = 10.0;
    }    
`;

var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main(){
        gl_FragColor = u_FragColor;
    }
`;

function compileShader(gl, vShaderText, fShaderText){
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vertexShader, vShaderText);
    gl.shaderSource(fragmentShader, fShaderText);

    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.log('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
    }

    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.log('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
    }

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        alert(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }

    return program;
}

function main(){
    var canvas = document.getElementById('webgl');
    var gl = canvas.getContext('webgl'); // FIXED: use 'webgl' instead of 'webgl2'

    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    let renderProgram = compileShader(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    gl.useProgram(renderProgram);

    renderProgram.u_Position = gl.getUniformLocation(renderProgram, 'u_Position');
    renderProgram.u_FragColor = gl.getUniformLocation(renderProgram, 'u_FragColor');

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    canvas.onmousedown = function(ev){
        click(ev, gl, canvas, renderProgram.u_Position, renderProgram.u_FragColor);
    };
}

let g_points = [];
let g_colors = [];

function click(ev, gl, canvas, u_Position, u_FragColor){
    let x = ev.clientX;
    let y = ev.clientY;
    let rect = canvas.getBoundingClientRect();

    // Convert to WebGL coordinates
    x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
    y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

    g_points.push([x, y]);

    // Color based on quadrant
    if (x >= 0 && y >= 0) {
        g_colors.push([1.0, 0.0, 0.0, 1.0]); // red
    } else if (x < 0 && y >= 0) {
        g_colors.push([0.0, 1.0, 0.0, 1.0]); // green
    } else if (x < 0 && y < 0) {
        g_colors.push([0.0, 0.0, 1.0, 1.0]); // blue
    } else {
        g_colors.push([1.0, 1.0, 1.0, 1.0]); // white
    }

    gl.clear(gl.COLOR_BUFFER_BIT);

    for (let i = 0; i < g_points.length; i++) {
        const [px, py] = g_points[i];
        const [r, g, b, a] = g_colors[i];
        gl.uniform4f(u_Position, px, py, 0.0, 1.0);
        gl.uniform4f(u_FragColor, r, g, b, a);
        gl.drawArrays(gl.POINTS, 0, 1);
    }
}
