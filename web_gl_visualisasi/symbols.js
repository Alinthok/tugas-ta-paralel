symbols = {
        '0': {
            "height": 22,
            "width": 15,
            "x": 4,
            "y": 1,
        },
        '1': {
            "height": 22,
            "width": 11,
            "x": 20,
            "y": 1,
        },
        '2': {
            "height": 22,
            "width": 16,
            "x": 32,
            "y": 1,
        },
        '3': {
            "height": 22,
            "width": 15,
            "x": 49,
            "y": 1,
        },
        '4': {
            "height": 22,
            "width": 16,
            "x": 65,
            "y": 1,
        },
        '5': {
            "height": 22,
            "width": 15,
            "x": 82,
            "y": 1,
        },
        '6': {
            "height": 22,
            "width": 15,
            "x": 98,
            "y": 1,
        },
        '7': {
            "height": 22,
            "width": 15,
            "x": 114,
            "y": 1,
        },
        '8': {
            "height": 22,
            "width": 15,
            "x": 130,
            "y": 1,
        },
        '9': {
            "height": 22,
            "width": 15,
            "x": 146,
            "y": 1,
        },
        'A': {
            "height": 22,
            "width": 22,
            "x": 162,
            "y": 1,
        },
        'B': {
            "height": 22,
            "width": 18,
            "x": 185,
            "y": 1,
        },
        'C': {
            "height": 22,
            "width": 20,
            "x": 204,
            "y": 1,
        },
        'D': {
            "height": 22,
            "width": 19,
            "x": 225,
            "y": 1,
        },
        'E': {
            "height": 22,
            "width": 17,
            "x": 1,
            "y": 24,
        },
        'F': {
            "height": 22,
            "width": 16,
            "x": 19,
            "y": 24,
        },
        'G': {
            "height": 22,
            "width": 21,
            "x": 36,
            "y": 24,
        },
        'H': {
            "height": 22,
            "width": 18,
            "x": 58,
            "y": 24,
        },
        'I': {
            "height": 22,
            "width": 6,
            "x": 77,
            "y": 24,
        },
        'J': {
            "height": 22,
            "width": 14,
            "x": 84,
            "y": 24,
        },
        'K': {
            "height": 22,
            "width": 19,
            "x": 99,
            "y": 24,
        },
        'L': {
            "height": 22,
            "width": 16,
            "x": 119,
            "y": 24,
        },
        'M': {
            "height": 22,
            "width": 21,
            "x": 136,
            "y": 24,
        },
        'N': {
            "height": 22,
            "width": 18,
            "x": 158,
            "y": 24,
        },
        'O': {
            "height": 22,
            "width": 21,
            "x": 177,
            "y": 24,
        },
        'P': {
            "height": 22,
            "width": 17,
            "x": 199,
            "y": 24,
        },
        'Q': {
            "height": 23,
            "width": 22,
            "x": 217,
            "y": 24,
        },
        'R': {
            "height": 22,
            "width": 20,
            "x": 1,
            "y": 48,
        },
        'S': {
            "height": 22,
            "width": 18,
            "x": 22,
            "y": 48,
        },
        'T': {
            "height": 22,
            "width": 18,
            "x": 41,
            "y": 48,
        },
        'U': {
            "height": 22,
            "width": 18,
            "x": 60,
            "y": 48,
        },
        'V': {
            "height": 22,
            "width": 20,
            "x": 79,
            "y": 48,
        },
        'W': {
            "height": 22,
            "width": 28,
            "x": 100,
            "y": 48,
        },
        'X': {
            "height": 22,
            "width": 20,
            "x": 129,
            "y": 48,
        },
        'Y': {
            "height": 22,
            "width": 20,
            "x": 150,
            "y": 48,
        },
        'Z': {
            "height": 22,
            "width": 18,
            "x": 171,
            "y": 48,
        }
    }

function generateStringVertices(str) {
    var positions = new Array(str.length*6*3)
    var texcoords = new Array(str.length*6*2)

    var texWidth = 256
    var texHeight = 128
    var offsetP = 0
    var offsetT = 0

    var pos = 0

    for (var i = 0; i < str.length; i++) {
        positions[offsetP + 0] = pos
        positions[offsetP + 1] = 0
        positions[offsetP + 2] = 0

        positions[offsetP + 3] = pos + symbols[str[i]].width
        positions[offsetP + 4] = 0
        positions[offsetP + 5] = 0

        positions[offsetP + 6] = pos
        positions[offsetP + 7] = symbols[str[i]].height
        positions[offsetP + 8] = 0

        positions[offsetP + 9] = pos + symbols[str[i]].width
        positions[offsetP + 10] = 0
        positions[offsetP + 11] = 0

        positions[offsetP + 12] = pos 
        positions[offsetP + 13] = symbols[str[i]].height
        positions[offsetP + 14] = 0

        positions[offsetP + 15] = pos + symbols[str[i]].width
        positions[offsetP + 16] = symbols[str[i]].height
        positions[offsetP + 17] = 0

        pos += symbols[str[i]].width

        var x1 = symbols[str[i]].x / texWidth
        var x2 = (symbols[str[i]].x + symbols[str[i]].width) / texWidth
        var y1 = (symbols[str[i]].y + symbols[str[i]].height) / texHeight
        var y2 = symbols[str[i]].y / texHeight

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

    return {
        positions: positions,
        texcoords: texcoords,
    }
}
