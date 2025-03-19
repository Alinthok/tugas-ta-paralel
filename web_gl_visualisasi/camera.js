class Camera {
    position = glMatrix.vec3.create()
    lookAt = glMatrix.vec3.create()
    xAngle = 60;
    yAngle = 30;
    radius = 3;

    constructor() {
        this.calcPosition()
    }

    calcPosition() {
        this.position = glMatrix.vec3.fromValues(Math.cos(this.xAngle*Math.PI/180)*Math.cos(this.yAngle*Math.PI/180)*this.radius, Math.sin(this.yAngle*Math.PI/180)*this.radius, Math.sin(this.xAngle*Math.PI/180)*Math.cos(this.yAngle*Math.PI/180)*this.radius)
    }

    move(vec3) {
        glMatrix.vec3.add(this.position, this.position, vec3)
        glMatrix.vec3.add(this.lookAt, this.lookAt, vec3)
    }

    changeAngle(xa, ya) {
        this.xAngle = xa; this.yAngle = ya;
        if (this.yAngle > 89) { this.yAngle = 89 }
        if (this.yAngle < -89) { this.yAngle = -89 }
        this.calcPosition()
    }

    addRadius(r) {
        this.radius += r
        this.calcPosition()
    }

    getCameraPos() {
        return glMatrix.vec3.fromValues(this.position[0], this.position[1], this.position[2])
    }
}
