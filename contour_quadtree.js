import * as THREE from 'three';

function lerp(val1, val2, v1, v2, isoLevel) {
    let ratio = ((isoLevel-val1)/(val2-val1))
    return new THREE.Vector3(v1.x + (v2.x - v1.x) * ratio, 
                             v1.y + (v2.y - v1.y) * ratio,
                             v1.z + (v2.z - v1.z) * ratio)
}

function addVector3toVertices(vertices, vec3) {
    vertices.push(vec3.x)
    vertices.push(vec3.y)
    vertices.push(vec3.z)
}

// TL = TOP LEFT, BL = BOTTOM LEFT, TR = TOP RIGHT, BR = BOTTOM RIGHT
function addTriangleTL(vertices, val_tl, val_tr, val_bl, v_tl, v_tr, v_bl, isoLevel) {
    addVector3toVertices(vertices, v_tl)
    addVector3toVertices(vertices, lerp(val_tl, val_bl, v_tl, v_bl, isoLevel))
    addVector3toVertices(vertices, lerp(val_tl, val_tr, v_tl, v_tr, isoLevel))
}

function addTriangleTR(vertices, val_tr, val_br, val_tl, v_tr, v_br, v_tl, isoLevel) {
    addVector3toVertices(vertices, v_tr)
    addVector3toVertices(vertices, lerp(val_tr, val_br, v_tr, v_br, isoLevel))
    addVector3toVertices(vertices, lerp(val_tr, val_tl, v_tr, v_tl, isoLevel))
}

function addTriangleBR(vertices, val_br, val_bl, val_tr, v_br, v_bl, v_tr, isoLevel) {
    addVector3toVertices(vertices, v_br)
    addVector3toVertices(vertices, lerp(val_br, val_bl, v_br, v_bl, isoLevel))
    addVector3toVertices(vertices, lerp(val_br, val_tr, v_br, v_tr, isoLevel))
}

function addTriangleBL(vertices, val_bl, val_tl, val_br, v_bl, v_tl, v_br, isoLevel) {
    addVector3toVertices(vertices, v_bl)
    addVector3toVertices(vertices, lerp(val_bl, val_tl, v_bl, v_tl, isoLevel))
    addVector3toVertices(vertices, lerp(val_bl, val_br, v_bl, v_br, isoLevel))
}

function addTrapezoidTL(vertices, val_tl, val_tr, val_bl, v_tl, v_tr, v_bl, v_br, isoLevel) {
    let top = lerp(val_tl, val_tr, v_tl, v_tr, isoLevel)
    let left = lerp(val_tl, val_bl, v_tl, v_bl, isoLevel)

    addVector3toVertices(vertices, left)
    addVector3toVertices(vertices, v_br)
    addVector3toVertices(vertices, v_bl)

    addVector3toVertices(vertices, left)
    addVector3toVertices(vertices, top)
    addVector3toVertices(vertices, v_br)

    addVector3toVertices(vertices, top)
    addVector3toVertices(vertices, v_br)
    addVector3toVertices(vertices, v_tr)
    
}

function addTrapezoidTR(vertices, val_tr, val_br, val_tl, v_tr, v_br, v_tl, v_bl, isoLevel) {
    let top = lerp(val_tl, val_tr, v_tl, v_tr, isoLevel)
    let right = lerp(val_tr, val_br, v_tr, v_br, isoLevel)

    addVector3toVertices(vertices, v_bl)
    addVector3toVertices(vertices, v_br)
    addVector3toVertices(vertices, right)

    addVector3toVertices(vertices, v_bl)
    addVector3toVertices(vertices, right)
    addVector3toVertices(vertices, top)

    addVector3toVertices(vertices, v_bl)
    addVector3toVertices(vertices, top)
    addVector3toVertices(vertices, v_tl)
}

function addTrapezoidBR(vertices, val_br, val_bl, val_tr, v_br, v_bl, v_tr, v_tl, isoLevel) {
    let right = lerp(val_tr, val_br, v_tr, v_br, isoLevel)
    let bottom = lerp(val_bl, val_br, v_bl, v_br, isoLevel)

    addVector3toVertices(vertices, v_tl)
    addVector3toVertices(vertices, right)
    addVector3toVertices(vertices, v_tr)

    addVector3toVertices(vertices, v_tl)
    addVector3toVertices(vertices, bottom)
    addVector3toVertices(vertices, right)

    addVector3toVertices(vertices, v_tl)
    addVector3toVertices(vertices, v_bl)
    addVector3toVertices(vertices, bottom)
}

function addTrapezoidBL(vertices, val_bl, val_tl, val_br, v_bl, v_tl, v_br, v_tr, isoLevel) {
    let left = lerp(val_tl, val_bl, v_tl, v_bl, isoLevel)
    let bottom = lerp(val_bl, val_br, v_bl, v_br, isoLevel)

    addVector3toVertices(vertices, left)
    addVector3toVertices(vertices, v_tl)
    addVector3toVertices(vertices, v_tr)

    addVector3toVertices(vertices, left)
    addVector3toVertices(vertices, bottom)
    addVector3toVertices(vertices, v_tr)

    addVector3toVertices(vertices, bottom)
    addVector3toVertices(vertices, v_br)
    addVector3toVertices(vertices, v_tr)
}

function addRectangleT(vertices, val_tl, val_tr, val_br, val_bl, v_tl, v_tr, v_br, v_bl, isoLevel) {
    let left = lerp(val_tl, val_bl, v_tl, v_bl, isoLevel)
    let right = lerp(val_tr, val_br, v_tr, v_br, isoLevel)

    addVector3toVertices(vertices, v_tl)
    addVector3toVertices(vertices, left)
    addVector3toVertices(vertices, right)

    addVector3toVertices(vertices, v_tl)
    addVector3toVertices(vertices, right)
    addVector3toVertices(vertices, v_tr)
}

function addRectangleR(vertices, val_tl, val_tr, val_br, val_bl, v_tl, v_tr, v_br, v_bl, isoLevel) {
    let top = lerp(val_tl, val_tr, v_tl, v_tr, isoLevel)
    let bottom = lerp(val_bl, val_br, v_bl, v_br, isoLevel)

    addVector3toVertices(vertices, top)
    addVector3toVertices(vertices, bottom)
    addVector3toVertices(vertices, v_br)
    
    addVector3toVertices(vertices, top)
    addVector3toVertices(vertices, v_br)
    addVector3toVertices(vertices, v_tr)
}

function addRectangleB(vertices, val_tl, val_tr, val_br, val_bl, v_tl, v_tr, v_br, v_bl, isoLevel) {
    let left = lerp(val_tl, val_bl, v_tl, v_bl, isoLevel)
    let right = lerp(val_tr, val_br, v_tr, v_br, isoLevel)

    addVector3toVertices(vertices, left)
    addVector3toVertices(vertices, v_bl)
    addVector3toVertices(vertices, right)

    addVector3toVertices(vertices, v_bl)
    addVector3toVertices(vertices, v_br)
    addVector3toVertices(vertices, right)
}

function addRectangleL(vertices, val_tl, val_tr, val_br, val_bl, v_tl, v_tr, v_br, v_bl, isoLevel) {
    let top = lerp(val_tl, val_tr, v_tl, v_tr, isoLevel)
    let bottom = lerp(val_bl, val_br, v_bl, v_br, isoLevel)

    addVector3toVertices(vertices, v_bl)
    addVector3toVertices(vertices, bottom)
    addVector3toVertices(vertices, top)
    
    addVector3toVertices(vertices, v_tl)
    addVector3toVertices(vertices, v_bl)
    addVector3toVertices(vertices, top)
}

function addDiamondTL_BR(vertices, val_tl, val_tr, val_br, val_bl, v_tl, v_tr, v_br, v_bl, isoLevel) {
    let top = lerp(val_tl, val_tr, v_tl, v_tr, isoLevel)
    let bottom = lerp(val_bl, val_br, v_bl, v_br, isoLevel)
    let left = lerp(val_tl, val_bl, v_tl, v_bl, isoLevel)
    let right = lerp(val_tr, val_br, v_tr, v_br, isoLevel)

    addVector3toVertices(vertices, v_tl)
    addVector3toVertices(vertices, left)
    addVector3toVertices(vertices, top)

    addVector3toVertices(vertices, left)
    addVector3toVertices(vertices, bottom)
    addVector3toVertices(vertices, right)

    addVector3toVertices(vertices, right)
    addVector3toVertices(vertices, top)
    addVector3toVertices(vertices, left)

    addVector3toVertices(vertices, v_br)
    addVector3toVertices(vertices, right)
    addVector3toVertices(vertices, bottom)
}

function addDiamondTR_BL(vertices, val_tl, val_tr, val_br, val_bl, v_tl, v_tr, v_br, v_bl, isoLevel) {
    let top = lerp(val_tl, val_tr, v_tl, v_tr, isoLevel)
    let bottom = lerp(val_bl, val_br, v_bl, v_br, isoLevel)
    let left = lerp(val_tl, val_bl, v_tl, v_bl, isoLevel)
    let right = lerp(val_tr, val_br, v_tr, v_br, isoLevel)

    addVector3toVertices(vertices, top)
    addVector3toVertices(vertices, right)
    addVector3toVertices(vertices, v_tr)

    addVector3toVertices(vertices, top)
    addVector3toVertices(vertices, left)
    addVector3toVertices(vertices, right)

    addVector3toVertices(vertices, left)
    addVector3toVertices(vertices, bottom)
    addVector3toVertices(vertices, right)

    addVector3toVertices(vertices, left)
    addVector3toVertices(vertices, v_bl)
    addVector3toVertices(vertices, bottom)
}

function addSquare(vertices, v_tl, v_tr, v_br, v_bl) {
    addVector3toVertices(vertices, v_tl)
    addVector3toVertices(vertices, v_tr)
    addVector3toVertices(vertices, v_bl)

    addVector3toVertices(vertices, v_bl)
    addVector3toVertices(vertices, v_tr)
    addVector3toVertices(vertices, v_br)
}

function isLarger(x, val) {
    if (x > val) {
        return 1
    } else {
        return 0
    }
}

class Node {
    constructor(x, y, z, size, min=Number.MIN_VALUE, max=Number.MAX_VALUE) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.size = size;
        this.min = min;
        this.max = max;
        // childrens
        this.ul = null;
        this.ur = null;
        this.br = null;
        this.bl = null;
    }
}

export function buildQuadTreeXY(data, x, y, z, size, width, height) {
    if (x > width-2 || y > height-2) {
        return new Node(x, y, z, size, Number.MAX_VALUE);
    }
    if (size == 1) {
        let min_v = Math.min(data[z][y][x], data[z][y][x+1], data[z][y+1][x+1], data[z][y+1][x]);
        let max_v = Math.max(data[z][y][x], data[z][y][x+1], data[z][y+1][x+1], data[z][y+1][x]);
        return new Node(x, y, z, size, min_v, max_v);
    }

    let node = new Node(x, y, z, size);
    let half = (size / 2) >> 0;

    node.ul = buildQuadTreeXY(data, x, y, z, half, width, height)
    node.ur = buildQuadTreeXY(data, x + half, y, z, half, width, height)
    node.br = buildQuadTreeXY(data, x + half, y + half, z, half, width, height)
    node.bl = buildQuadTreeXY(data, x, y + half, z, half, width, height)

    node.min = Math.min(node.ul.min, node.ur.min, node.br.min, node.bl.min)
    node.max = Math.max(node.ul.max, node.ur.max, node.br.max, node.bl.max)
    return node
}

export function traverseXY(data, mesh, iso, root, width, height) {
    if (root.x < width-1 && root.y < height-1) {
        let [v_tl, v_tr, v_br, v_bl, d_tl, d_tr, d_br, d_bl] = getPointsDirXY(data, root.x, root.y, root.z, root.size)
        if (root.min <= iso && iso < root.max) {
            if (root.ul == null) {
                drawCell(mesh, d_tl, d_tr, d_br, d_bl, v_tl, v_tr, v_br, v_bl, iso);                
            }
            else {
                traverseXY(data, mesh, iso, root.ul, width, height)
                traverseXY(data, mesh, iso, root.ur, width, height)
                traverseXY(data, mesh, iso, root.br, width, height)
                traverseXY(data, mesh, iso, root.bl, width, height)
            }
        }
        else if (root.min > iso) {
            clampXY(v_tr, v_br, v_bl, width, height, root.z)
            drawCell(mesh, d_tl, d_tr, d_br, d_bl, v_tl, v_tr, v_br, v_bl, iso);
        }
    }
}

export function buildQuadTreeXZ(data, x, y, z, size, width, height) {
    if (x > width-2 || z > height-2) {
        return new Node(x, y, z, size, Number.MAX_VALUE);
    }
    if (size == 1) {
        let min_v = Math.min(data[z][y][x], data[z][y][x+1], data[z+1][y][x+1], data[z+1][y][x]);
        let max_v = Math.max(data[z][y][x], data[z][y][x+1], data[z+1][y][x+1], data[z+1][y][x]);
        return new Node(x, y, z, size, min_v, max_v);
    }

    let node = new Node(x, y, z, size);
    let half = (size / 2) >> 0;

    node.ul = buildQuadTreeXZ(data, x, y, z, half, width, height)
    node.ur = buildQuadTreeXZ(data, x + half, y, z, half, width, height)
    node.br = buildQuadTreeXZ(data, x + half, y, z + half, half, width, height)
    node.bl = buildQuadTreeXZ(data, x, y, z + half, half, width, height)

    node.min = Math.min(node.ul.min, node.ur.min, node.br.min, node.bl.min)
    node.max = Math.max(node.ul.max, node.ur.max, node.br.max, node.bl.max)
    return node
}

export function traverseXZ(data, mesh, iso, root, width, height) {
    if (root.x < width-1 && root.z < height-1) {
        let [v_tl, v_tr, v_br, v_bl, d_tl, d_tr, d_br, d_bl] = getPointsDirXZ(data, root.x, root.z, root.y, root.size)
        if (root.min <= iso && iso < root.max) {
            if (root.ul == null) {
                drawCell(mesh, d_tl, d_tr, d_br, d_bl, v_tl, v_tr, v_br, v_bl, iso);                
            }
            else {
                traverseXZ(data, mesh, iso, root.ul, width, height)
                traverseXZ(data, mesh, iso, root.ur, width, height)
                traverseXZ(data, mesh, iso, root.br, width, height)
                traverseXZ(data, mesh, iso, root.bl, width, height)
            }
        }
        else if (root.min > iso) {
            clampXZ(v_tr, v_br, v_bl, width, height, root.y)
            drawCell(mesh, d_tl, d_tr, d_br, d_bl, v_tl, v_tr, v_br, v_bl, iso);
        }
    }
}

export function buildQuadTreeYZ(data, x, y, z, size, width, height) {
    if (y > width-2 || z > height-2) {
        return new Node(x, y, z, size, Number.MAX_VALUE);
    }
    if (size == 1) {
        let min_v = Math.min(data[z][y][x], data[z][y+1][x], data[z+1][y+1][x], data[z+1][y][x]);
        let max_v = Math.max(data[z][y][x], data[z][y+1][x], data[z+1][y+1][x], data[z+1][y][x]);
        return new Node(x, y, z, size, min_v, max_v);
    }

    let node = new Node(x, y, z, size);
    let half = (size / 2) >> 0;

    node.ul = buildQuadTreeYZ(data, x, y, z, half, width, height)
    node.ur = buildQuadTreeYZ(data, x, y + half, z, half, width, height)
    node.br = buildQuadTreeYZ(data, x, y + half, z + half, half, width, height)
    node.bl = buildQuadTreeYZ(data, x, y, z + half, half, width, height)

    node.min = Math.min(node.ul.min, node.ur.min, node.br.min, node.bl.min)
    node.max = Math.max(node.ul.max, node.ur.max, node.br.max, node.bl.max)
    return node
}

export function traverseYZ(data, mesh, iso, root, width, height) {
    if (root.y < width-1 && root.z < height-1) {
        let [v_tl, v_tr, v_br, v_bl, d_tl, d_tr, d_br, d_bl] = getPointsDirYZ(data, root.y, root.z, root.x, root.size)
        if (root.min <= iso && iso < root.max) {
            if (root.ul == null) {
                drawCell(mesh, d_tl, d_tr, d_br, d_bl, v_tl, v_tr, v_br, v_bl, iso);                
            }
            else {
                traverseYZ(data, mesh, iso, root.ul, width, height)
                traverseYZ(data, mesh, iso, root.ur, width, height)
                traverseYZ(data, mesh, iso, root.br, width, height)
                traverseYZ(data, mesh, iso, root.bl, width, height)
            }
        }
        else if (root.min > iso) {
            clampYZ(v_tr, v_br, v_bl, width, height, root.x)
            drawCell(mesh, d_tl, d_tr, d_br, d_bl, v_tl, v_tr, v_br, v_bl, iso);
        }
    }
}

function drawCell(mesh, d_tl, d_tr, d_br, d_bl, v_tl, v_tr, v_br, v_bl, isoLevel) {
    let state = (isLarger(d_tl, isoLevel) * 8) + (isLarger(d_tr, isoLevel) * 4) + (isLarger(d_br, isoLevel) * 2) + isLarger(d_bl, isoLevel)
    switch (state) {
    case 1:
        addTriangleBL(mesh, d_bl, d_tl, d_br, v_bl, v_tl, v_br, isoLevel);
        break;
    case 2:
        addTriangleBR(mesh, d_br, d_bl, d_tr, v_br, v_bl, v_tr, isoLevel);
        break;
    case 3:
        addRectangleB(mesh, d_tl, d_tr, d_br, d_bl, v_tl, v_tr, v_br, v_bl, isoLevel)
        break;
    case 4:
        addTriangleTR(mesh, d_tr, d_br, d_tl, v_tr, v_br, v_tl, isoLevel)
        break;
    case 5:
        addDiamondTR_BL(mesh, d_tl, d_tr, d_br, d_bl, v_tl, v_tr, v_br, v_bl, isoLevel)
        break;
    case 6:
        addRectangleR(mesh, d_tl, d_tr, d_br, d_bl, v_tl, v_tr, v_br, v_bl, isoLevel)
        break;
    case 7:
        addTrapezoidTL(mesh, d_tl, d_tr, d_bl, v_tl, v_tr, v_bl, v_br, isoLevel);
        break;
    case 8:
        addTriangleTL(mesh, d_tl, d_tr, d_bl, v_tl, v_tr, v_bl, isoLevel)
        break;
    case 9:
        addRectangleL(mesh, d_tl, d_tr, d_br, d_bl, v_tl, v_tr, v_br, v_bl, isoLevel)
        break;
    case 10:
        addDiamondTL_BR(mesh, d_tl, d_tr, d_br, d_bl, v_tl, v_tr, v_br, v_bl, isoLevel)
        break;
    case 11:
        addTrapezoidTR(mesh, d_tr, d_br, d_tl, v_tr, v_br, v_tl, v_bl, isoLevel)
        break;
    case 12:
        addRectangleT(mesh, d_tl, d_tr, d_br, d_bl, v_tl, v_tr, v_br, v_bl, isoLevel)
        break;
    case 13:
        addTrapezoidBR(mesh, d_br, d_bl, d_tr, v_br, v_bl, v_tr, v_tl, isoLevel);
        break;
    case 14:
        addTrapezoidBL(mesh, d_bl, d_tl, d_br, v_bl, v_tl, v_br, v_tr, isoLevel);
        break;
    case 15:
        addSquare(mesh, v_tl, v_tr, v_br, v_bl)
        break;
    }
}

function getPointsDirXY(data, i, j, idx, size) {
    let v_tl; let v_tr; let v_br; let v_bl;
    let d_tl; let d_tr; let d_br; let d_bl;
    let x_pos = i; 
    let y_pos = j;
    let z_pos = idx;

    v_tl = new THREE.Vector3(x_pos, y_pos, z_pos)
    v_tr = new THREE.Vector3(x_pos+size, y_pos, z_pos)
    v_br = new THREE.Vector3(x_pos+size, y_pos+size, z_pos)
    v_bl = new THREE.Vector3(x_pos, y_pos+size, z_pos)

    d_tl = data[idx][j][i]
    d_tr = data[idx][j][i+1]
    d_br = data[idx][j+1][i+1]
    d_bl = data[idx][j+1][i]

    return [v_tl, v_tr, v_br, v_bl, d_tl, d_tr, d_br, d_bl]
}

function getPointsDirXZ(data, i, j, idx, size) {
    let v_tl; let v_tr; let v_br; let v_bl;
    let d_tl; let d_tr; let d_br; let d_bl;
    let x_pos = i;
    let y_pos = idx; 
    let z_pos = j;

    v_tl = new THREE.Vector3(x_pos, y_pos, z_pos)
    v_tr = new THREE.Vector3(x_pos+size, y_pos, z_pos)
    v_br = new THREE.Vector3(x_pos+size, y_pos, z_pos+size)
    v_bl = new THREE.Vector3(x_pos, y_pos, z_pos+size)

    d_tl = data[j][idx][i]
    d_tr = data[j][idx][i+1]
    d_br = data[j+1][idx][i+1]
    d_bl = data[j+1][idx][i]

    return [v_tl, v_tr, v_br, v_bl, d_tl, d_tr, d_br, d_bl]
}

function getPointsDirYZ(data, i, j, idx, size) {
    let v_tl; let v_tr; let v_br; let v_bl;
    let d_tl; let d_tr; let d_br; let d_bl;
    let x_pos = idx;
    let y_pos = i; 
    let z_pos = j;

    v_tl = new THREE.Vector3(x_pos, y_pos, z_pos)
    v_tr = new THREE.Vector3(x_pos, y_pos, z_pos+size)
    v_br = new THREE.Vector3(x_pos, y_pos+size, z_pos+size)
    v_bl = new THREE.Vector3(x_pos, y_pos+size, z_pos)

    d_tl = data[j][i][idx]
    d_tr = data[j+1][i][idx]
    d_br = data[j+1][i+1][idx]
    d_bl = data[j][i+1][idx]

    return [v_tl, v_tr, v_br, v_bl, d_tl, d_tr, d_br, d_bl]
}

function clampXY(v_tr, v_br, v_bl, width, height, z) {
    v_tr.clamp(new THREE.Vector3(0, 0, z), new THREE.Vector3(width-1, height-1, z))
    v_br.clamp(new THREE.Vector3(0, 0, z), new THREE.Vector3(width-1, height-1, z))
    v_bl.clamp(new THREE.Vector3(0, 0, z), new THREE.Vector3(width-1, height-1, z))
}

function clampXZ(v_tr, v_br, v_bl, width, height, y) {
    v_tr.clamp(new THREE.Vector3(0, y, 0), new THREE.Vector3(width-1, y, height-1))
    v_br.clamp(new THREE.Vector3(0, y, 0), new THREE.Vector3(width-1, y, height-1))
    v_bl.clamp(new THREE.Vector3(0, y, 0), new THREE.Vector3(width-1, y, height-1))
}

function clampYZ(v_tr, v_br, v_bl, width, height, x) {
    v_tr.clamp(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, width-1, height-1))
    v_br.clamp(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, width-1, height-1))
    v_bl.clamp(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, width-1, height-1))
}

export function test_mesh() {
    let mesh = []
    addTriangleTL(mesh, 1, 0, 0, new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), 0.5)
    addTriangleTR(mesh, 1, 0, 0, new THREE.Vector3(2, 0, 0), new THREE.Vector3(2, 1, 0), new THREE.Vector3(1, 0, 0), 0.5)
    addTriangleBR(mesh, 1, 0, 0, new THREE.Vector3(3, 1, 0), new THREE.Vector3(2, 1, 0), new THREE.Vector3(3, 0, 0), 0.5)
    addTriangleBL(mesh, 1, 0, 0, new THREE.Vector3(3, 1, 0), new THREE.Vector3(3, 0, 0), new THREE.Vector3(4, 1, 0), 0.5)

    addRectangleT(mesh, 1, 1, 0, 0, new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 1, 0), new THREE.Vector3(1, 2, 0), new THREE.Vector3(0, 2, 0), 0.5)
    addRectangleR(mesh, 0, 1, 1, 0, new THREE.Vector3(1, 1, 0), new THREE.Vector3(2, 1, 0), new THREE.Vector3(2, 2, 0), new THREE.Vector3(1, 2, 0), 0.5)
    addRectangleB(mesh, 0, 0, 1, 1, new THREE.Vector3(2, 1, 0), new THREE.Vector3(3, 1, 0), new THREE.Vector3(3, 2, 0), new THREE.Vector3(2, 2, 0), 0.5)
    addRectangleL(mesh, 1, 0, 0, 1, new THREE.Vector3(3, 1, 0), new THREE.Vector3(4, 1, 0), new THREE.Vector3(4, 2, 0), new THREE.Vector3(3, 2, 0), 0.5)

    addTrapezoidTL(mesh, 1, 0, 0, new THREE.Vector3(0, 2, 0), new THREE.Vector3(1, 2, 0), new THREE.Vector3(0, 3, 0), new THREE.Vector3(1, 3, 0), 0.5)
    addTrapezoidTR(mesh, 1, 0, 0, new THREE.Vector3(2, 2, 0), new THREE.Vector3(2, 3, 0), new THREE.Vector3(1, 2, 0), new THREE.Vector3(1, 3, 0), 0.5)
    addTrapezoidBR(mesh, 1, 0, 0, new THREE.Vector3(3, 3, 0), new THREE.Vector3(2, 3, 0), new THREE.Vector3(3, 2, 0), new THREE.Vector3(2, 2, 0), 0.5)
    addTrapezoidBL(mesh, 1, 0, 0, new THREE.Vector3(3, 3, 0), new THREE.Vector3(3, 2, 0), new THREE.Vector3(4, 3, 0), new THREE.Vector3(4, 2, 0), 0.5)

    addDiamondTL_BR(mesh, 0, 1, 0, 1, new THREE.Vector3(0, 3, 0), new THREE.Vector3(1, 3, 0), new THREE.Vector3(1, 4, 0), new THREE.Vector3(0, 4, 0), 0.5)
    addDiamondTR_BL(mesh, 1, 0, 1, 0, new THREE.Vector3(1, 3, 0), new THREE.Vector3(2, 3, 0), new THREE.Vector3(2, 4, 0), new THREE.Vector3(1, 4, 0), 0.5)

    addSquare(mesh, new THREE.Vector3(0, 4, 0), new THREE.Vector3(1, 4, 0), new THREE.Vector3(1, 5, 0), new THREE.Vector3(0, 5, 0))
    return mesh
}