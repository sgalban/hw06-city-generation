import {vec3, vec4} from 'gl-matrix';
import {gl} from '../../globals';

abstract class Drawable {
    count: number = 0;
  
    bufIdx: WebGLBuffer;
    bufPos: WebGLBuffer;
    bufNor: WebGLBuffer;
    bufEnd: WebGLBuffer;
    bufThic: WebGLBuffer;
  
    idxBound: boolean = false;
    posBound: boolean = false;
    norBound: boolean = false;
    endBound: boolean = false;
    thicBound: boolean = false;

    numInstances: number = 0;
  
    abstract create() : void;
  
    destory() {
        gl.deleteBuffer(this.bufIdx);
        gl.deleteBuffer(this.bufPos);
        gl.deleteBuffer(this.bufNor);
        gl.deleteBuffer(this.bufEnd);
        gl.deleteBuffer(this.bufThic);
    }
  
    generateIdx() {
        this.idxBound = true;
        this.bufIdx = gl.createBuffer();
    }
  
    generatePos() {
        this.posBound = true;
        this.bufPos = gl.createBuffer();
    }
  
    generateNor() {
        this.norBound = true;
        this.bufNor = gl.createBuffer();
    }

    generateEndpoints() {
        this.endBound = true;
        this.bufEnd = gl.createBuffer();
    }
  
    generateThickness() {
        this.thicBound = true;
        this.bufThic = gl.createBuffer();
    }
  
    bindIdx(): boolean {
        if (this.idxBound) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
        }
        return this.idxBound;
    }
  
    bindPos(): boolean {
        if (this.posBound) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
        }
        return this.posBound;
    }
  
    bindNor(): boolean {
        if (this.norBound) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
        }
        return this.norBound;
    }

    bindEndpoints(): boolean {
        if (this.endBound) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufEnd);
        }
        return this.endBound;
    }

    bindThickness(): boolean {
        if (this.thicBound) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bufThic);
        }
        return this.thicBound;
    }

    setNumInstances(num: number): void {
        this.numInstances = num;
    }

    setInstanceVBOs(endpoints: vec4[], thickness: number[]) {
        throw new Error("Must be implemented in instanced geometry subclass")
    }

  
    elemCount(): number {
        return this.count;
    }
  
    drawMode(): GLenum {
        return gl.TRIANGLES;
    }
};

export default Drawable;
