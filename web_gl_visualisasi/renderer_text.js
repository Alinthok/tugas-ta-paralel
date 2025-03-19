"use strict";

class Renderer {
    #vertexShader;
    #fragmentShader;
    #shaderProgram;

    #vao;

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
        -0.5,  0.5, -0.5
    ];

    vertex_plane = [
        
    ]

    textureCoordinates = [
        // Front
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        1.0, 1.0,
        0.0, 1.0,
        0.0, 0.0,
        // Back
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        1.0, 1.0,
        0.0, 1.0,
        0.0, 0.0,
        // Top
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
        0.0, 1.0,
        0.0, 0.0,
        1.0, 0.0,
        // Bottom
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
        0.0, 1.0,
        0.0, 0.0,
        1.0, 0.0,
        // Right
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0,
        1.0, 0.0,
        0.0, 0.0,
        0.0, 1.0,
        // Left
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0,
        1.0, 0.0,
        0.0, 0.0,
        0.0, 1.0,
    ];

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
        
        var fragmentShaderSource = `#version 300 es
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

        var string = "5678"

        var positions = new Array(string.length*6*3)
        var texcoords = new Array(string.length*6*2)

        var texWidth = 256
        var texHeight = 128
        var offsetP = 0
        var offsetT = 0

        var pos = 0

        for (var i = 0; i < string.length; i++) {
            positions[offsetP + 0] = pos
            positions[offsetP + 1] = 0
            positions[offsetP + 2] = 0

            positions[offsetP + 3] = pos + symbols[string[i]].width
            positions[offsetP + 4] = 0
            positions[offsetP + 5] = 0

            positions[offsetP + 6] = pos
            positions[offsetP + 7] = symbols[string[i]].height
            positions[offsetP + 8] = 0

            positions[offsetP + 9] = pos + symbols[string[i]].width
            positions[offsetP + 10] = 0
            positions[offsetP + 11] = 0

            positions[offsetP + 12] = pos 
            positions[offsetP + 13] = symbols[string[i]].height
            positions[offsetP + 14] = 0

            positions[offsetP + 15] = pos + symbols[string[i]].width
            positions[offsetP + 16] = symbols[string[i]].height
            positions[offsetP + 17] = 0

            pos += symbols[string[i]].width

            var x1 = symbols[string[i]].x / texWidth
            var x2 = (symbols[string[i]].x + symbols[string[i]].width) / texWidth
            var y1 = (symbols[string[i]].y + symbols[string[i]].height) / texHeight
            var y2 = symbols[string[i]].y / texHeight

            texcoords[offsetT + 0] = x1
            texcoords[offsetT + 1] = y1

            texcoords[offsetT + 2] = x2
            texcoords[offsetT + 3] = y1

            texcoords[offsetT + 4] = x1
            texcoords[offsetT + 5] = y2

            texcoords[offsetT + 6] = x2
            texcoords[offsetT + 7] = y1

            texcoords[offsetT + 8] = x1
            texcoords[offsetT + 9] = y2

            texcoords[offsetT + 10] = x2
            texcoords[offsetT + 11] = y2

            offsetP += 18
            offsetT += 12 
        }

        console.log(positions)
        console.log(texcoords)
        
        // create shaders
        this.#vertexShader = this.#createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        this.#fragmentShader = this.#createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.#shaderProgram = this.#createProgram(gl, this.#vertexShader, this.#fragmentShader);

        // init vao, vbo
        this.#vao = gl.createVertexArray();
        var vbo = gl.createBuffer();

        gl.bindVertexArray(this.#vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(0);

        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        var texcoordAttributeLocation = gl.getAttribLocation(this.#shaderProgram, "a_texcoord");
        // create the texcoord buffer, make it the current ARRAY_BUFFER
        // and copy in the texcoord values
        var texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
        
        // Turn on the attribute
        gl.enableVertexAttribArray(texcoordAttributeLocation);
        
        // Tell the attribute how to get data out of texcoordBuffer (ARRAY_BUFFER)
        var size = 2;          // 2 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floating point values
        var normalize = true;  // convert from 0-255 to 0.0-1.0
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next texcoord
        var offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(texcoordAttributeLocation, size, type, normalize, stride, offset);

        // Create a texture.
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        // Fill the texture with a 1x1 blue pixel.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                    new Uint8Array([0, 0, 255, 255]));
        
        // Asynchronously load an image
        var image = new Image();
        image.src = "resources/arial_regular_20.PNG";
        image.addEventListener('load', function() {
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        });

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

    drawCube(gl) {        
        var model = [1, 0, 0, 0,
                     0, 1, 0, 0,
                     0, 0, 1, 0,
                     0, 0, 0, 1,];
        
        model = mat4.translate(model, 0, 0, -5)
        model = mat4.scale(model, 0.05, 0.05, 1)

        const d = new Date();
        let time = d.getTime();
        
        //model = mat4.yRotation(model, time/3600.0)
        //model = mat4.xRotation(model, time/1800.0)

        var view = [1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1,];

        var width = 600; var height = 400; var depth = 400;
        var projection = [2 / width, 0, 0, 0,
                          0, -2 / height, 0, 0,
                          0, 0, 2 / depth, 0,
                          -1, 1, 0, 1,];

        projection = mat4.perspective(1.39626, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 1000)

        var modelLoc = gl.getUniformLocation(this.#shaderProgram, "model");
        var viewLoc  = gl.getUniformLocation(this.#shaderProgram, "view");
        var projectionLoc  = gl.getUniformLocation(this.#shaderProgram, "projection");

        gl.uniformMatrix4fv(modelLoc, false, model);
        gl.uniformMatrix4fv(viewLoc, false, view);
        gl.uniformMatrix4fv(projectionLoc, false, projection);

        var vertexColorLocation = gl.getUniformLocation(this.#shaderProgram, "color");

        gl.uniform4f(vertexColorLocation, 1.0, 1.0, 0, 1.0);

        // Bind the attribute/buffer set we want.
        gl.bindVertexArray(this.#vao);
        
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = 24;
        gl.drawArrays(primitiveType, offset, count); 
    }
}