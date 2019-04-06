import {vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';

class Prism extends Drawable {
    center: vec4;

    indices: Uint32Array;
    positions: Float32Array;
    normals: Float32Array;

    offsets: Float32Array;
    heights: Float32Array;
    thicknesses: Float32Array;
    sides: number;
  
    constructor(center: vec3, sides: number) {
        super(); // Call the constructor of the super class. This is required.
        if (sides < 3) {
            sides = 3;
        }
        this.sides = sides;
        this.center = vec4.fromValues(center[0], center[1], center[2], 1);
    }
  
    create() {
        let positions = [];
        let normals = [];
        let indices = [];
        let curIdx = 0;
        for (let i = 0; i < this.sides; i++) {

            // First generate the radial caps
            let angle1 = i * 2 * Math.PI / this.sides;
            let angle2 = ((i + 1) % this.sides) * 2 * Math.PI / this.sides;
            let x1 = Math.cos(angle1) / 2;
            let x2 = Math.cos(angle2) / 2;
            let z1 = Math.sin(angle1) / 2;
            let z2 = Math.sin(angle2) / 2;
            // Bottom Cap
            positions.push(
                0, 0, 0, 1,
                x1, 0, z1, 1,
                x2, 0, z2, 1
            );
            normals.push(
                0, 0, 1, 0,
                0, 0, 1, 0,
                0, 0, 1, 0,
            )
            indices.push(curIdx + 0, curIdx + 1, curIdx + 2);

            // Top Cap
            positions.push(
                0, 1, 0, 1,
                x1, 1, z1, 1,
                x2, 1, z2, 1
            );
            normals.push(
                0, 0, -1, 0,
                0, 0, -1, 0,
                0, 0, -1, 0,
            )
            indices.push(curIdx + 3, curIdx + 4, curIdx + 5);

            // Now get all the sides
            positions.push(
                x1, 0, z1, 1,
                x2, 0, z2, 1,
                x2, 1, z2, 1,
                x1, 1, z1, 1
            );
            let normal: vec4 = vec4.fromValues((x1 + x2) / 2, 0, (z1 + z2) / 2, 0);
            vec4.normalize(normal, normal);
            normals.push(
                normal[0], normal[1], normal[2], normal[3],
                normal[0], normal[1], normal[2], normal[3],
                normal[0], normal[1], normal[2], normal[3],
                normal[0], normal[1], normal[2], normal[3]
            );
            indices.push(
                curIdx + 6, curIdx + 7, curIdx + 8,
                curIdx + 6, curIdx + 8, curIdx + 9
            );
            curIdx += 10;
        }

        this.positions = new Float32Array(positions);
        this.normals = new Float32Array(normals);
        this.indices = new Uint32Array(indices);
  
        this.generateIdx();
        this.generatePos();
        this.generateNor();
        this.generateOff();
        this.generateHgt();
        this.generateThickness();
    
        this.count = this.indices.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
        gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);
    
        console.log(`Created ` + this.sides + ` Prism`);
    }

    setBuildingVBOs(offsets: vec4[], heights: number[], thicknesses: number[]) {
        let offsetArray: number[] = [];
        for (let off of offsets) {
            offsetArray.push(off[0], off[1], off[2], off[3]);
        }

        this.offsets = new Float32Array(offsetArray);
        this.heights = new Float32Array(heights);
        this.thicknesses = new Float32Array(thicknesses);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufOff);
        gl.bufferData(gl.ARRAY_BUFFER, this.offsets, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufHgt);
        gl.bufferData(gl.ARRAY_BUFFER, this.heights, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufThic);
        gl.bufferData(gl.ARRAY_BUFFER, this.thicknesses, gl.STATIC_DRAW);
    }
};

export default Prism;
