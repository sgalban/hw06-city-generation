import {vec2, vec3} from 'gl-matrix';

function fract(num: number) : number {
    return num - Math.floor(num);
}

function smoothstep(x: number) {
    let t = x < 0 ? 0 : x > 1 ? 1 : x; 
    return t * t * (3.0 - 2.0 * t);
}

function mix(x: number, y: number, a: number) {
    return x * (1.0 - a) + y * a;
}

function random1(p: vec2, seed: vec2) : number {
    return fract(Math.sin(vec2.dot(
        vec2.add(vec2.create(), p, seed
    ), vec2.fromValues(127.1, 311.7))));
}

function brownianNoise(p: vec2, seed: vec2) : number {
    let boxPos: vec2 = vec2.fromValues(Math.floor(p[0]), Math.floor(p[1]));
    let corner0: number = random1(vec2.add(vec2.create(), boxPos, vec2.fromValues(0.0, 0.0)), seed);
    let corner1: number = random1(vec2.add(vec2.create(), boxPos, vec2.fromValues(1.0, 0.0)), seed);
    let corner2: number = random1(vec2.add(vec2.create(), boxPos, vec2.fromValues(0.0, 1.0)), seed);
    let corner3: number = random1(vec2.add(vec2.create(), boxPos, vec2.fromValues(1.0, 1.0)), seed);
    let tx: number = smoothstep(fract(p[0]));
    let ty: number = smoothstep(fract(p[1]));
    return mix(mix(corner0, corner1, tx), mix(corner2, corner3, tx), ty);
}

function fbm(noisePos: vec2, numOctaves: number, startFrequency: number, seed: vec2) : number {
    let totalNoise: number = 0.0;
    let normalizer: number = 0.0;
    const PERSISTENCE : number = 0.5;

    let frequency: number = startFrequency;
    let amplitude: number = PERSISTENCE;

    for (let i = 0; i < numOctaves; i++) {
        normalizer += amplitude;
        totalNoise += brownianNoise(vec2.scale(vec2.create(), noisePos, frequency), seed) * amplitude;
        frequency *= 2.0;
        amplitude *= PERSISTENCE;
    }
    return totalNoise / normalizer;
}

export default class GeoData {
    terrainSeed: vec2;
    populationSeed: vec2;
    landRatio: number;

    constructor(_terrainSeed: vec2, _populationSeed: vec2, _landRatio: number) {
        this.terrainSeed = _terrainSeed;
        this.populationSeed = _populationSeed;
        this.landRatio = _landRatio;
    }

    setLandRatio(ratio: number): void {
        this.landRatio = ratio;
    }

    isLand(pos: vec2): boolean {
        let terrainNoise = fbm(pos, 3, 0.05, this.terrainSeed);
        return terrainNoise < this.landRatio - 0.075;
    }

}