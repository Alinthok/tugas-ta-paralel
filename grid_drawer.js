import * as THREE from 'three';

let divide = 5

export function generateGridLines(points, slice_x, slice_y, slice_z, nx, ny, nz) {
    const stepX = (nx-1) / (divide - 1);
    const stepY = (ny-1) / (divide - 1);
    const stepZ = (nz-1) / (divide - 1);
    for (let i = 1; i < divide-1; i++) {
        const x = stepX * i;
        const y = stepY * i;
        const z = stepZ * i;

        // FRONT face (z = 0): XY grid
        if (slice_x - 1 > x) {
            pushLine(points, x, 0, 0, x, slice_y - 1, 0); // vertical
            pushLine(points, x, 0, slice_z - 1, x, slice_y - 1, slice_z - 1);
            pushLine(points, x, slice_y - 1, 0, x, slice_y - 1, slice_z - 1); // vertical
            pushLine(points, x, 0, 0, x, 0, slice_z - 1);
        }
        if (slice_y - 1 > y) {
            pushLine(points, 0, y, 0, slice_x - 1, y, 0); // horizontal
            pushLine(points, 0, y, slice_z - 1, slice_x - 1, y, slice_z - 1);
            pushLine(points, 0, y, 0, 0, y, slice_z - 1); // vertical
            pushLine(points, slice_x - 1, y, 0, slice_x - 1, y, slice_z - 1);
        }
        if (slice_z - 1 > z) {
            pushLine(points, 0, 0, z, 0, slice_y - 1, z); // horizontal
            pushLine(points, slice_x - 1, 0, z, slice_x - 1, slice_y - 1, z);
            pushLine(points, 0, slice_y - 1, z, slice_x - 1, slice_y - 1, z); // horizontal
            pushLine(points, 0, 0, z, slice_x - 1, 0, z);
        }
    }
}

export function generateTickLines(points, slice_x, slice_y, slice_z) {
    const stepX = (slice_x-1) / (divide - 1);
    const stepY = (slice_y-1) / (divide - 1);
    const stepZ = (slice_z-1) / (divide - 1);

    for (let i = 1; i < divide-1; i++) {
        const x = stepX * i;
        const y = stepY * i;
        const z = stepZ * i;

        const tick = 0.25;
        // hard coding ticklines
        pushLine(points, x, 0, tick, x, 0, 0);
        pushLine(points, x, slice_y - 1, tick, x, slice_y - 1, 0);
        pushLine(points, 0, y, tick, 0, y, 0);
        pushLine(points, slice_x - 1, y, tick, slice_x - 1, y, 0);
        pushLine(points, x, 0, slice_z - 1 - tick, x, 0, slice_z - 1);
        pushLine(points, x, slice_y - 1, slice_z - 1 - tick, x, slice_y - 1, slice_z - 1);
        pushLine(points, 0, y, slice_z - 1 - tick, 0, y, slice_z - 1);
        pushLine(points, slice_x - 1, y, slice_z - 1 - tick, slice_x - 1, y, slice_z - 1);
        pushLine(points, tick, y, 0, 0, y, 0);
        pushLine(points, tick, y, slice_z - 1, 0, y, slice_z - 1);
        pushLine(points, tick, 0, z, 0, 0, z);
        pushLine(points, tick, slice_y - 1, z, 0, slice_y - 1, z);
        pushLine(points, slice_x - 1 - tick, y, 0, slice_x - 1, y, 0);
        pushLine(points, slice_x - 1 - tick, y, slice_z - 1, slice_x - 1, y, slice_z - 1);
        pushLine(points, slice_x - 1 - tick, 0, z, slice_x - 1, 0, z);
        pushLine(points, slice_x - 1 - tick, slice_y - 1, z, slice_x - 1, slice_y - 1, z);
        pushLine(points, x, slice_y - 1 - tick, 0, x, slice_y - 1, 0);
        pushLine(points, x, slice_y - 1 - tick, slice_z - 1, x, slice_y - 1, slice_z - 1);
        pushLine(points, 0, slice_y - 1 - tick, z, 0, slice_y - 1, z);
        pushLine(points, slice_x - 1, slice_y - 1 - tick, z, slice_x - 1, slice_y - 1, z);
        pushLine(points, x, tick, 0, x, 0, 0);
        pushLine(points, x, tick, slice_z - 1, x, 0, slice_z - 1);
        pushLine(points, 0, tick, z, 0, 0, z);
        pushLine(points, slice_x - 1, tick, z, slice_x - 1, 0, z);
    }
}

function pushLine(points, x, y, z, x2, y2, z2) {
    points.push(new THREE.Vector3(x, y, z));
    points.push(new THREE.Vector3(x2, y2, z2));
}