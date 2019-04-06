import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import Drawable from './Drawable';
import {gl} from '../../globals';

var activeProgram: WebGLProgram = null;

export class Shader {
    shader: WebGLShader;
  
    constructor(type: number, source: string) {
        this.shader = gl.createShader(type);
        gl.shaderSource(this.shader, source);
        gl.compileShader(this.shader);
    
        if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
            throw gl.getShaderInfoLog(this.shader);
        }
    }
};

class ShaderProgram {
    prog: WebGLProgram;
  
    attrPos: number;
    attrNor: number;
    attrCol: number;

    attrEnd: number;
    attrThic: number;
    attrOff: number;
    attrHgt: number;
  
    unifModel: WebGLUniformLocation;
    unifModelInvTr: WebGLUniformLocation;
    unifViewProj: WebGLUniformLocation;
    unifColor: WebGLUniformLocation;
    unifPlanePos: WebGLUniformLocation;
    unifTime: WebGLUniformLocation;
    unifLighting: WebGLUniformLocation;
    unifRatio: WebGLUniformLocation;
    unifShowPop: WebGLUniformLocation;
    unifRef: WebGLUniformLocation;
    unifEye: WebGLUniformLocation;
    unifUp: WebGLUniformLocation;
    unifDimensions: WebGLUniformLocation;
  
    constructor(shaders: Array<Shader>) {
        this.prog = gl.createProgram();
    
        for (let shader of shaders) {
            gl.attachShader(this.prog, shader.shader);
        }
        gl.linkProgram(this.prog);
        if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
            throw gl.getProgramInfoLog(this.prog);
        }
    
        this.attrPos = gl.getAttribLocation(this.prog, "vs_Pos");
        this.attrNor = gl.getAttribLocation(this.prog, "vs_Nor");
        this.attrCol = gl.getAttribLocation(this.prog, "vs_Col");
        this.attrEnd = gl.getAttribLocation(this.prog, "vs_Endpoints");
        this.attrThic = gl.getAttribLocation(this.prog, "vs_Thickness");
        this.attrOff = gl.getAttribLocation(this.prog, "vs_Offset");
        this.attrHgt = gl.getAttribLocation(this.prog, "vs_Height");

        this.unifModel      = gl.getUniformLocation(this.prog, "u_Model");
        this.unifModelInvTr = gl.getUniformLocation(this.prog, "u_ModelInvTr");
        this.unifViewProj   = gl.getUniformLocation(this.prog, "u_ViewProj");
        this.unifPlanePos   = gl.getUniformLocation(this.prog, "u_PlanePos");
        this.unifTime       = gl.getUniformLocation(this.prog, "u_Time");
        this.unifLighting   = gl.getUniformLocation(this.prog, "u_UseLight");
        this.unifRatio      = gl.getUniformLocation(this.prog, "u_LandRatio");
        this.unifShowPop    = gl.getUniformLocation(this.prog, "u_ShowPop");
        this.unifEye   = gl.getUniformLocation(this.prog, "u_Eye");
        this.unifRef   = gl.getUniformLocation(this.prog, "u_Ref");
        this.unifUp   = gl.getUniformLocation(this.prog, "u_Up");
        this.unifDimensions   = gl.getUniformLocation(this.prog, "u_Dimensions");
    }
  
    use() {
        if (activeProgram !== this.prog) {
            gl.useProgram(this.prog);
            activeProgram = this.prog;
        }
    }

    setEyeRefUp(eye: vec3, ref: vec3, up: vec3) {
        this.use();
        if(this.unifEye !== -1) {
            gl.uniform3f(this.unifEye, eye[0], eye[1], eye[2]);
        }
        if(this.unifRef !== -1) {
            gl.uniform3f(this.unifRef, ref[0], ref[1], ref[2]);
        }
        if(this.unifUp !== -1) {
            gl.uniform3f(this.unifUp, up[0], up[1], up[2]);
        }
    }

    setDimensions(width: number, height: number) {
        this.use();
        if(this.unifDimensions !== -1) {
            gl.uniform2f(this.unifDimensions, width, height);
        }
    }
  
    setModelMatrix(model: mat4) {
        this.use();
        if (this.unifModel !== -1) {
            gl.uniformMatrix4fv(this.unifModel, false, model);
        }
    
        if (this.unifModelInvTr !== -1) {
            let modelinvtr: mat4 = mat4.create();
            mat4.transpose(modelinvtr, model);
            mat4.invert(modelinvtr, modelinvtr);
            gl.uniformMatrix4fv(this.unifModelInvTr, false, modelinvtr);
        }
    }
  
    setViewProjMatrix(vp: mat4) {
        this.use();
        if (this.unifViewProj !== -1) {
            gl.uniformMatrix4fv(this.unifViewProj, false, vp);
        }
    }
  
    setPlanePos(pos: vec2) {
        this.use();
        if (this.unifPlanePos !== -1) {
            gl.uniform2fv(this.unifPlanePos, pos);
        }
    }
  
    setTime(time: number) {
        this.use();
        if (this.unifTime !== -1) {
            gl.uniform1i(this.unifTime, time);
        }
    }

    setWaterRatio(ratio: number) {
        this.use();
        if (this.unifRatio !== -1) {
            gl.uniform1f(this.unifRatio, ratio);
        }
    }

    setLightingOn(lighting: boolean) {
        this.use();
        let l = lighting ? 1 : 0;
        if (this.unifLighting !== -1) {
            gl.uniform1i(this.unifLighting, l);
        }
    }

    setShowPop(showPop: boolean) {
        this.use();
        if (this.unifLighting !== -1) {
            gl.uniform1i(this.unifShowPop, showPop ? 1 : 0);
        }
    }

    draw(d: Drawable) {
        this.use();
    
        if (this.attrPos != -1 && d.bindPos()) {
            gl.enableVertexAttribArray(this.attrPos);
            gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrPos, 0);
        }
    
        if (this.attrNor != -1 && d.bindNor()) {
            gl.enableVertexAttribArray(this.attrNor);
            gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrNor, 0);
        }

        if (this.attrEnd != -1 && d.bindEndpoints()) {
            gl.enableVertexAttribArray(this.attrEnd);
            gl.vertexAttribPointer(this.attrEnd, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrEnd, 1);
        }

        if (this.attrThic != -1 && d.bindThickness()) {
            gl.enableVertexAttribArray(this.attrThic);
            gl.vertexAttribPointer(this.attrThic, 1, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrThic, 1);
        }

        if (this.attrOff != -1 && d.bindOff()) {
            gl.enableVertexAttribArray(this.attrOff);
            gl.vertexAttribPointer(this.attrOff, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrOff, 1);
        }

        if (this.attrHgt != -1 && d.bindHgt()) {
            gl.enableVertexAttribArray(this.attrHgt);
            gl.vertexAttribPointer(this.attrHgt, 1, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.attrHgt, 1);
        }
    
        d.bindIdx();
        if (d.numInstances > 0) {
            gl.drawElementsInstanced(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0, d.numInstances);
        }
        else {
            gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);
        }
    
        if (this.attrPos != -1) {
            gl.disableVertexAttribArray(this.attrPos)
        };
        if (this.attrNor != -1) {
            gl.disableVertexAttribArray(this.attrNor)
        };
        if (this.attrEnd != -1) {
            gl.disableVertexAttribArray(this.attrEnd)
        };
        if (this.attrThic != -1) {
            gl.disableVertexAttribArray(this.attrThic)
        };
        if (this.attrOff != -1) {
            gl.disableVertexAttribArray(this.attrOff)
        };
        if (this.attrHgt != -1) {
            gl.disableVertexAttribArray(this.attrHgt)
        };
    }
};

export default ShaderProgram;
