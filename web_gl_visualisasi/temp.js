castRayFromScreen(gl, mouse_x, mouse_y, xAngle, yAngle, radius, xOffset, yOffset, zOffset) {
    var x = (2.0 * mouse_x) / gl.canvas.clientWidth - 1.0;
    var y = 1.0 - (2.0 * mouse_y) / gl.canvas.clientHeight;
    var z = 1.0;
    var ray_nds = glMatrix.vec3.fromValues(x, y, z);
    var ray_clip = glMatrix.vec4.fromValues(ray_nds[0], ray_nds[1], -1.0, 1.0);
    var projection = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projection, 1.5708, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 1000)
    var inverseProj = glMatrix.mat4.create();
    glMatrix.mat4.invert(inverseProj, projection)
    var ray_eye = glMatrix.vec4.create();
    glMatrix.vec4.transformMat4(ray_eye, ray_clip, inverseProj)
    ray_eye = glMatrix.vec4.fromValues(ray_eye[0], ray_eye[1], -1.0, 0.0)
    var view = glMatrix.mat4.create()
    glMatrix.mat4.lookAt(view, glMatrix.vec3.fromValues(Math.cos(xAngle)*Math.cos(yAngle)*radius, Math.sin(yAngle)*radius, Math.sin(xAngle)*Math.cos(yAngle)*radius), glMatrix.vec3.fromValues(0, 0, 0), glMatrix.vec3.fromValues(0, 1, 0))
    glMatrix.mat4.translate(view, view, glMatrix.vec3.fromValues(xOffset, yOffset, zOffset))
    var inverseView = glMatrix.mat4.create()
    glMatrix.mat4.invert(inverseView, view)
    var ray_wor = glMatrix.vec4.create()
    glMatrix.vec4.transformMat4(ray_wor, ray_eye, inverseView)
    glMatrix.vec4.normalize(ray_wor, ray_wor);

    return ray_wor
}

var ray = renderer.castRayFromScreen(gl, mouseX, mouseY, xAngle*Math.PI/180, yAngle*Math.PI/180, radius, lookAt[0], lookAt[1], lookAt[2])
    renderer.drawLine(gl, camPos[0], camPos[1], camPos[2], camPos[0]+ray[0]*200, camPos[1]+ray[1]*200, camPos[2]+ray[2]*200)

        /*camPos = glMatrix.vec3.fromValues(Math.cos(xAngle*Math.PI/180)*Math.cos(yAngle*Math.PI/180)*radius+lookAt[0], Math.sin(yAngle*Math.PI/180)*radius+lookAt[1], Math.sin(xAngle*Math.PI/180)*Math.cos(yAngle*Math.PI/180)*radius+lookAt[2])
    var forward = glMatrix.vec3.create()
    var a = glMatrix.vec3.create()
    glMatrix.vec3.normalize(forward, glMatrix.vec3.sub(a, lookAt, camPos))
    var right = glMatrix.vec3.create()
    var b = glMatrix.vec3.create()
    glMatrix.vec3.normalize(right, glMatrix.vec3.cross(b, glMatrix.vec3.fromValues(0, 1, 0), forward))
    up = glMatrix.vec3.create()
    glMatrix.vec3.cross(up, forward, right)

    var mx = ((mouseX - gl.canvas.clientWidth * 0.5) * (1.0 / gl.canvas.clientWidth) * 1.5708 * 0.5);
    var my = ((mouseY - gl.canvas.clientHeight * 0.5) * (1.0 / gl.canvas.clientWidth) * 1.5708 * 0.5);
    glMatrix.vec3.scale(dx, right, -mx)
    glMatrix.vec3.scale(dy, up, -my)

    glMatrix.vec3.add(dir, dx, dy)
    glMatrix.vec3.scale(dir, dir, 2.0)
    glMatrix.vec3.add(dir, dir, forward)
    glMatrix.vec3.normalize(dir, dir)*/


    
    gl.stencilFunc(gl.NOTEQUAL, 1, 0xFF);
    gl.stencilMask(0x00); 
    gl.disable(gl.DEPTH_TEST);

    //temp
    if (!this.calcOffset) {
    var count = 56
    var i = 0
    for (var x = 0; x < 4; x++) {
      for (var y = 0; y < 4; y++) {
        for (var z = 0; z < 4; z++) {
          if (x == 0 || x == 3 || y == 0 || y == 3 || z == 0 || z == 3) {
            this.offsets[i+0] = x * 1.5*0.9090
            this.offsets[i+1] = y * 1.5*0.9090
            this.offsets[i+2] = z * 1.5*0.9090
  
            this.colors[i+0] = 1.0
            this.colors[i+1] = 1.0
            this.colors[i+2] = 1.0
            i += 3
          }
        }
      }
      console.log("fasojao")
    }
    this.calcOffset = true
    }
    this.bindOffsets(this.offsets, this.colors)
    //temp

    glMatrix.mat4.scale(model, model, glMatrix.vec3.fromValues(1.1, 1.1, 1.1))
    var modelLoc = gl.getUniformLocation(this.#shaderProgram, "model");

    gl.uniformMatrix4fv(modelLoc, false, model);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, count);

    gl.stencilMask(0xFF);
    gl.stencilFunc(gl.ALWAYS, 1, 0xFF);   
    gl.enable(gl.DEPTH_TEST);  


    gl.stencilFunc(gl.ALWAYS, 1, 0xFF); 
    gl.stencilMask(0xFF); 


    drawCubeOutlineInstanced(gl, size, count) {
        var model = glMatrix.mat4.create()

        glMatrix.mat4.translate(model, model, glMatrix.vec3.fromValues(1, 1, 1))
        glMatrix.mat4.scale(model, model, glMatrix.vec3.fromValues(1, 1, 1))

        var modelLoc = gl.getUniformLocation(this.#shaderProgram, "model");

        gl.uniformMatrix4fv(modelLoc, false, model);

        // Bind the attribute/buffer set we want.
        gl.bindVertexArray(this.#vaoCubeLine);
        gl.drawArraysInstanced(gl.LINES, 0, 24, count);
    }

    bindOffsetsCubeLine(offsets, colors) {
        gl.bindVertexArray(this.#vaoCubeLine);
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


    
        // init vao, vbo for cube line
        this.#vaoCubeLine = gl.createVertexArray();
        var vbo = gl.createBuffer();
        gl.bindVertexArray(this.#vaoCubeLine);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertex_cube_line), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);


        
    vertex_cube_line = [
        0.51, 0.51, 0.51,
        0.51, 0.51, -0.51,

        0.51, 0.51, 0.51,
        -0.51, 0.51, 0.51,

        0.51, 0.51, -0.51,
        -0.51, 0.51, -0.51,

        -0.51, 0.51, 0.51,
        -0.51, 0.51, -0.51,

        0.51, -0.51, 0.51,
        0.51, -0.51, -0.51,

        0.51, -0.51, 0.51,
        -0.51, -0.51, 0.51,

        0.51, -0.51, -0.51,
        -0.51, -0.51, -0.51,

        -0.51, -0.51, 0.51,
        -0.51, -0.51, -0.51,

        0.51, 0.51, 0.51,
        0.51, -0.51, 0.51,

        -0.51, 0.51, 0.51,
        -0.51, -0.51, 0.51,

        0.51, 0.51, -0.51,
        0.51, -0.51, -0.51,

        -0.51, 0.51, -0.51,
        -0.51, -0.51, -0.51,
    ]


    textVAO; textShader;

    bindText(positions, texcoords) {
        var vbo = gl.createBuffer();
        gl.bindVertexArray(this.textVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        var texcoordAttributeLocation = gl.getAttribLocation(this.textShader, "a_texcoord");
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

        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        // Fill the texture with a 1x1 blue pixel.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                    new Uint8Array([0, 0, 255, 255]));

        // Asynchronously load an image
        var image = new Image();
        image.src = "resources/arial_regular_20.PNG";
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }

    drawString(x, y, str) {
        gl.useProgram(this.textShader);

        var r = generateStringVertices(str)
        this.bindText(r.positions, r.texcoords)
     
        var model = glMatrix.mat4.create()

        glMatrix.mat4.translate(model, model, glMatrix.vec3.fromValues(x, y, 1))
        glMatrix.mat4.scale(model, model, glMatrix.vec3.fromValues(1, 1, 1))

        var view = glMatrix.mat4.create()
        var projection = glMatrix.mat4.create()
        glMatrix.mat4.ortho(projection, 0, 600, 0, 400, -1, 1)

        var modelLoc = gl.getUniformLocation(this.textShader, "model");
        var viewLoc  = gl.getUniformLocation(this.textShader, "view");
        var projectionLoc  = gl.getUniformLocation(this.textShader, "projection");

        gl.uniformMatrix4fv(modelLoc, false, model);
        gl.uniformMatrix4fv(viewLoc, false, view);
        gl.uniformMatrix4fv(projectionLoc, false, projection);

        // Bind the attribute/buffer set we want.
        gl.bindVertexArray(this.textVAO);

        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = 24;
        gl.drawArrays(primitiveType, offset, count); 

        gl.useProgram(this.#shaderProgram);
    }

    function onKeyDown(event) {
        camPos = glMatrix.vec3.fromValues(Math.cos(xAngle*Math.PI/180)*Math.cos(yAngle*Math.PI/180)*radius+lookAt[0], Math.sin(yAngle*Math.PI/180)*radius+lookAt[1], Math.sin(xAngle*Math.PI/180)*Math.cos(yAngle*Math.PI/180)*radius+lookAt[2])
        var forward = glMatrix.vec3.create()
        var a = glMatrix.vec3.create()
        glMatrix.vec3.normalize(forward, glMatrix.vec3.sub(a, lookAt, camPos))
        var right = glMatrix.vec3.create()
        var b = glMatrix.vec3.create()
        glMatrix.vec3.normalize(right, glMatrix.vec3.cross(b, glMatrix.vec3.fromValues(0, 1, 0), forward))
        up = glMatrix.vec3.create()
        glMatrix.vec3.cross(up, forward, right)
    
        switch (event.key) {
        case "ArrowLeft":
            glMatrix.vec3.scaleAndAdd(lookAt, lookAt, right, -0.1)
            break;
        case "ArrowRight":
            glMatrix.vec3.scaleAndAdd(lookAt, lookAt, right, 0.1)
            break;
        case "ArrowUp":
            glMatrix.vec3.scaleAndAdd(lookAt, lookAt, up, -0.1)
            break;
        case "ArrowDown":
            glMatrix.vec3.scaleAndAdd(lookAt, lookAt, up, 0.1)
            break;
        }
        
        renderer.updateView(xAngle*Math.PI/180, yAngle*Math.PI/180, radius, lookAt[0], lookAt[1], lookAt[2])
      }