"use strict";

class Renderer {
    #vertexShader;
    #fragmentShader;
    #shaderProgram;

    #vao;
    #vaoLine;

    vertex_cube = [
        -0.5, -0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5,  0.5, -0.5,
        0.5,  0.5, -0.5,
        -0.5,  0.5, -0.5,
        -0.5, -0.5, -0.5,

        -0.5, -0.5,  0.5,
        0.5, -0.5,  0.5,
        0.5,  0.5,  0.5,
        0.5,  0.5,  0.5,
        -0.5,  0.5,  0.5,
        -0.5, -0.5,  0.5,

        -0.5,  0.5,  0.5,
        -0.5,  0.5, -0.5,
        -0.5, -0.5, -0.5,
        -0.5, -0.5, -0.5,
        -0.5, -0.5,  0.5,
        -0.5,  0.5,  0.5,

        0.5,  0.5,  0.5,
        0.5,  0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5, -0.5,  0.5,
        0.5,  0.5,  0.5,

        -0.5, -0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5, -0.5,  0.5,
        0.5, -0.5,  0.5,
        -0.5, -0.5,  0.5,
        -0.5, -0.5, -0.5,

        -0.5,  0.5, -0.5,
        0.5,  0.5, -0.5,
        0.5,  0.5,  0.5,
        0.5,  0.5,  0.5,
        -0.5,  0.5,  0.5,
        -0.5,  0.5, -0.5,
    ];

    vertex_line = [
        0.0, 0.0, 0.0,
        1.0, 1.0, 1.0,
    ]

    #createShader(gl, type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
        return shader;
        }
    
        console.log(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }
    
    #createProgram(gl, vertexShader, fragmentShader) {
        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        var success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
        return program;
        }
    
        console.log(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }

    init(gl) {
        var vertexShaderSource = `#version 300 es
								 layout (location = 0) in vec3 aPos;
                                 layout (location = 1) in vec3 offset;
                                 layout (location = 2) in vec3 aColor;
								 uniform mat4 model;
								 uniform mat4 view;
								 uniform mat4 projection;
                                 out vec3 color;
								 void main()
								 {
								    gl_Position = projection * view * model * vec4(aPos.x+offset.x, aPos.y+offset.y, aPos.z+offset.z, 1.0);
                                    color = aColor;
                                 }`;
        
        var fragmentShaderSource = `#version 300 es
                                   precision highp float;
								   out vec4 FragColor;

                                   in vec3 color;

								   void main()
								   {
                                      FragColor = vec4(color, 1.0);
								   }`

        var textVertexShaderSource = `#version 300 es
                                      layout (location = 0) in vec3 aPos;
                                      uniform mat4 model;
                                      uniform mat4 view;
                                      uniform mat4 projection;
                                      in vec2 a_texcoord;
                                      out vec2 v_texcoord;
                                      void main()
                                      {
                                          gl_Position = projection * view * model * vec4(aPos.x, aPos.y, aPos.z, 1.0);
                                          v_texcoord = a_texcoord;
                                      }`;

        var textFragmentShaderSource = `#version 300 es
                                        precision highp float;
								        out vec4 FragColor;
                                        in vec2 v_texcoord;
                                        uniform sampler2D u_texture;
								        void main()
								        {
								            FragColor = texture(u_texture, v_texcoord);;
								        }`;

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        // create shaders
        this.#vertexShader = this.#createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        this.#fragmentShader = this.#createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.#shaderProgram = this.#createProgram(gl, this.#vertexShader, this.#fragmentShader);

        // init vao, vbo
        this.#vao = gl.createVertexArray();
        var vbo = gl.createBuffer();
        gl.bindVertexArray(this.#vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertex_cube), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        // init vao, vbo for line vertices
        this.#vaoLine = gl.createVertexArray();
        var vbo = gl.createBuffer();
        gl.bindVertexArray(this.#vaoLine);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertex_line), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        
        gl.viewport(0, 0, 600, 400);

        // Clear the canvas
        gl.clearColor(0, 0, 0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(this.#shaderProgram);
    }

    refresh(gl) {
        // Clear the canvas
        gl.clearColor(0, 0, 0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    setCamera() {
        var view = glMatrix.mat4.create()
        var projection = glMatrix.mat4.create()
        glMatrix.mat4.perspective(projection, 1.5708, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 1000)
        var viewLoc  = gl.getUniformLocation(this.#shaderProgram, "view");
        var projectionLoc  = gl.getUniformLocation(this.#shaderProgram, "projection");
        gl.uniformMatrix4fv(viewLoc, false, view);
        gl.uniformMatrix4fv(projectionLoc, false, projection);
    }

    updateView(position, lookAt) {
        var view = glMatrix.mat4.create()
        glMatrix.mat4.lookAt(view, position, lookAt, glMatrix.vec3.fromValues(0, 1, 0))
        var viewLoc = gl.getUniformLocation(this.#shaderProgram, "view");
        gl.uniformMatrix4fv(viewLoc, false, view);
    }

    bindOffsets(offsets, colors) {
        gl.bindVertexArray(this.#vao);
        var offsetBufferID = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, offsetBufferID);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(offsets), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(1, 1);

        var colorBufferID = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferID);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(2, 1);
    }

    bindOffsetOnly(offsets) {
        gl.bindVertexArray(this.#vao);
        var offsetBufferID = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, offsetBufferID);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(offsets), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(1, 1);
    }

    bindColorOnly(colors) {
        gl.bindVertexArray(this.#vao);
        var colorBufferID = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferID);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(2, 1);
    }

    drawCubeInstanced(gl, count) {
        var model = glMatrix.mat4.create()

        var modelLoc = gl.getUniformLocation(this.#shaderProgram, "model");

        gl.uniformMatrix4fv(modelLoc, false, model);

        // Bind the attribute/buffer set we want.
        gl.bindVertexArray(this.#vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, count);
    }

    setLineColor(r, g, b) {
        gl.bindVertexArray(this.#vaoLine);
        var colorBufferID = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferID);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([r, g, b, r, g, b]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
    }

    drawLine(gl, x1, y1, z1, x2, y2, z2) {
        var model = glMatrix.mat4.create()

        glMatrix.mat4.translate(model, model, glMatrix.vec3.fromValues(x1, y1, z1))
        glMatrix.mat4.scale(model, model, glMatrix.vec3.fromValues(x2 - x1, y2 - y1, z2 - z1))

        var modelLoc = gl.getUniformLocation(this.#shaderProgram, "model");

        gl.uniformMatrix4fv(modelLoc, false, model);

        // Bind the attribute/buffer set we want.
        gl.bindVertexArray(this.#vaoLine);
        gl.drawArrays(gl.LINES, 0, 2); 
    }

    drawLineXYZ(gl, x1, y1, z1) {
        this.drawLine(gl, x1, y1, z1, 1000+x1, 0+y1, 0+z1)
        this.drawLine(gl, x1, y1, z1, 0+x1, 1000+y1, 0+z1)
        this.drawLine(gl, x1, y1, z1, 0+x1, 0+y1, 1000+z1)
    }
}