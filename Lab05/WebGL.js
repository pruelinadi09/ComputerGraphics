var VSHADER_SOURCE = `
        attribute vec4 a_Position;
        attribute vec4 a_Color;
        uniform mat4 u_mvpMatrix;
        varying vec4 v_Color;
        void main(){
            gl_Position = u_mvpMatrix * a_Position;
            v_Color = a_Color;
        }    
    `;

var FSHADER_SOURCE = `
    precision mediump float;
    varying vec4 v_Color;
    void main(){
        gl_FragColor = v_Color;
    }
`;


function createProgram(gl, vertexShader, fragmentShader){
    //create the program and attach the shaders
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    //if success, return the program. if not, log the program info, and delete it.
    if(gl.getProgramParameter(program, gl.LINK_STATUS)){
        return program;
    }
    alert(gl.getProgramInfoLog(program) + "");
    gl.deleteProgram(program);
}

function compileShader(gl, vShaderText, fShaderText){
    //////Build vertex and fragment shader objects
    var vertexShader = gl.createShader(gl.VERTEX_SHADER)
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    //The way to  set up shader text source
    gl.shaderSource(vertexShader, vShaderText)
    gl.shaderSource(fragmentShader, fShaderText)
    //compile vertex shader
    gl.compileShader(vertexShader)
    if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)){
        console.log('vertex shader ereror');
        var message = gl.getShaderInfoLog(vertexShader); 
        console.log(message);//print shader compiling error message
    }
    //compile fragment shader
    gl.compileShader(fragmentShader)
    if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)){
        console.log('fragment shader ereror');
        var message = gl.getShaderInfoLog(fragmentShader);
        console.log(message);//print shader compiling error message
    }

    /////link shader to program (by a self-define function)
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    //if not success, log the program info, and delete it.
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
        alert(gl.getProgramInfoLog(program) + "");
        gl.deleteProgram(program);
    }

    return program;
}

/////BEGIN:///////////////////////////////////////////////////////////////////////////////////////////////
/////The folloing three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////
function initAttributeVariable(gl, a_attribute, buffer){
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}

function initArrayBufferForLaterUse(gl, data, num, type) {
    // Create a buffer object
    var buffer = gl.createBuffer();
    if (!buffer) {
      console.log('Failed to create the buffer object');
      return null;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  
    // Store the necessary information to assign the object to the attribute variable later
    buffer.num = num;
    buffer.type = type;
  
    return buffer;
}

function initVertexBufferForLaterUse(gl, vertices, colors){
    var nVertices = vertices.length / 3;

    var o = new Object();
    o.vertexBuffer = initArrayBufferForLaterUse(gl, new Float32Array(vertices), 3, gl.FLOAT);
    o.colorBuffer = initArrayBufferForLaterUse(gl, new Float32Array(colors), 3, gl.FLOAT);
    if (!o.vertexBuffer || !o.colorBuffer) 
        console.log("Error: in initVertexBufferForLaterUse(gl, vertices, colors)"); 
    o.numVertices = nVertices;

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return o;
}
/////END://///////////////////////////////////////////////////////////////////////////////////////////////
/////The folloing three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

var vertices = new Float32Array(//9 vertices (three triangles)
        [
            0.0, 1.0, -2.0, //x, y, z of the 1st vertex of the 1st triangle
            -0.5, -1.0, -2.0,
            0.5, -1.0, -2.0,

            0.0, 1.0, -0.0,
            -0.5, -1.0, -0.0,
            0.5, -1.0, -0.0,

            0.0, 1.0, 2.0,
            -0.5, -1.0, 2.0,
            0.5, -1.0, 2.0,
        ]   
       );

var colors = new Float32Array(//9 vertices (three triangles)'s color
       [
           0.7, 0.0, 0.0, //r, g, b of the 1st vertex of the 1st triangle
           0.7, 0.0, 0.0,
           0.7, 0.0, 0.0, 

           0.0, 0.7, 0.0, 
           0.0, 0.7, 0.0, 
           0.0, 0.7, 0.0, 

           0.0, 0.0, 0.7, 
           0.0, 0.0, 0.7, 
           0.0, 0.0, 0.7, 
       ]   
      );

var modelMatrix1 = new Matrix4();
var modelMatrix2 = new Matrix4();
var backViewMatrix = new Matrix4();
var frontViewMatrix = new Matrix4();
var orthoViewMatrix = new Matrix4();
var pespProjMatrix1 = new Matrix4();
var pespProjMatrix2 = new Matrix4();
var orthoProjMatrix = new Matrix4();
var transformMat = new Matrix4();
var mouseLastX, mouseLastY;
var mouseDragging = false;
var angleX = 0, angleY = 0;
var canvas, gl;

function main(){
    //////Get the canvas context
    canvas = document.getElementById('webgl');
    gl = canvas.getContext('webgl2');
    if(!gl){
        console.log('Failed to get the rendering context for WebGL');
        return ;
    }

    program = compileShader(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    gl.useProgram(program);

    /////prepare attribute reference of the shader
    program.a_Position = gl.getAttribLocation(program, 'a_Position');
    program.a_Color = gl.getAttribLocation(program, 'a_Color');
    program.u_mvpMatrix = gl.getUniformLocation(program, 'u_mvpMatrix');
    if(program.a_Position<0 || program.a_Color<0 || program.u_mvpMatrix < 0)  
        console.log('Error: f(program.a_Position<0 || program.a_Color<0 || .....');

    /////create vertex buffer of rotating point, center points, rotating triangle for later use
    triangles = initVertexBufferForLaterUse(gl, vertices, colors);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.SCISSOR_TEST);//enable scissor test to only apply background clear on one viewport

    backViewMatrix.setLookAt(0, 0, 10,  0, 0, 0,  0, 1, 0);
    pespProjMatrix1.setPerspective(30, canvas.width / canvas.height, 1, 100);

    frontViewMatrix.setLookAt(0, 0, -10, 0, 0, 100, 0, 1, 0);
    pespProjMatrix2.setPerspective(30, canvas.width / canvas.height, 1, 100);

    orthoProjMatrix.setOrtho(-10, 10, -10, 10, 1, 100);
    orthoViewMatrix.setLookAt(0, 0, -10,  0, 0, 100,  0, 1, 0);

    canvas.onmousedown = function(ev){mouseDown(ev)};
    canvas.onmousemove = function(ev){mouseMove(ev)};
    canvas.onmouseup = function(ev){mouseUp(ev)};

    draw(mouseLastX, mouseLastY);
}

function drawOneViewport(gl, viewportX, viewportY, viewportWidth, viewportHeight,
                        bgColorR, bgColorG, bgColorB,
                        projMatrix, viewMatrix, modelMatrixTriangleSet1, modelMatrixTriangleSet2 ){

    gl.viewport(viewportX, viewportY, viewportWidth, viewportHeight);
    gl.scissor(viewportX, viewportY, viewportWidth, viewportHeight);
    //scissor: make the background clear only apply to this region

    ////clear background color and depth buffer
    gl.clearColor(bgColorR, bgColorG, bgColorB, 1.0);
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT) 
    
    //draw a set of triangles
    transformMat.set(projMatrix);
    transformMat.multiply(viewMatrix);
    transformMat.multiply(modelMatrixTriangleSet1);
    initAttributeVariable(gl, program.a_Position, triangles.vertexBuffer);
    initAttributeVariable(gl, program.a_Color, triangles.colorBuffer); 
    gl.uniformMatrix4fv(program.u_mvpMatrix, false, transformMat.elements);
    gl.drawArrays(gl.TRIANGLES, 0, triangles.numVertices);

    if( modelMatrixTriangleSet2 != null){//if we have the second modelMatrix
        //draw the second set of triangles
        transformMat.set(projMatrix);
        transformMat.multiply(viewMatrix);
        transformMat.multiply(modelMatrixTriangleSet2);
        initAttributeVariable(gl, program.a_Position, triangles.vertexBuffer);
        initAttributeVariable(gl, program.a_Color, triangles.colorBuffer); 
        gl.uniformMatrix4fv(program.u_mvpMatrix, false, transformMat.elements);
        gl.drawArrays(gl.TRIANGLES, 0, triangles.numVertices);
    }
}

function mouseDown(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    if( rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom){
        mouseLastX = x;
        mouseLastY = y;
        mouseDragging = true;
    }
}

function mouseUp(ev){ 
    mouseDragging = false;
}

function mouseMove(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;

    draw(x, y);
}

function draw(x, y){
    if( mouseDragging ){
        var factor = 100/canvas.height; //100 determine the spped you rotate the object
        var dx = factor * (x - mouseLastX);
        var dy = factor * (y - mouseLastY);

        angleX += dx; //yes, x for y, y for x, this is right
        angleY += dy;
    }
    mouseLastX = x;
    mouseLastY = y;

    //call drawOneViewPort three times to draw the three views
    modelMatrix1.setRotate(-angleY, 1, 0, 0);
    modelMatrix1.rotate(angleX, 0, 1, 0);
    modelMatrix1.translate(-0.6, 0, 0);

    modelMatrix2.setRotate(-angleY, 1, 0, 0);
    modelMatrix2.rotate(angleX, 0, 1, 0);
    modelMatrix2.translate(0.6, 0, 0);

    //this only draw one set of triangles because we pass "null" for the last argument
    drawOneViewport(gl, 0, 200, canvas.width, 0.5* canvas.height,
                    0.8, 0.8, 0.8,
                    pespProjMatrix1, backViewMatrix, modelMatrix1, modelMatrix2 );
    drawOneViewport(gl, 0, 0, 0.5 * canvas.width, 0.5 * canvas.height,
        0, 0, 0,
        pespProjMatrix2, frontViewMatrix, modelMatrix1, modelMatrix2 );
    drawOneViewport(gl, 200, 0, 0.5 * canvas.width, 0.5 * canvas.height,
        0.3, 0.3, 0.3,
        orthoProjMatrix, orthoViewMatrix, modelMatrix1, modelMatrix2 );
}
