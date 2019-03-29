#version 300 es

uniform mat4 u_Model;
uniform mat4 u_ModelInvTr;
uniform mat4 u_ViewProj;
uniform vec2 u_PlanePos; // Our location in the virtual world displayed by the plane
uniform float u_LandRatio;
uniform highp int u_UseLight;
uniform highp int u_Time;

in vec4 vs_Pos;
in vec4 vs_Nor;
in vec4 vs_Col;

out vec3 fs_Pos;
out vec4 fs_Nor;
out vec4 fs_Col;

const vec2 SEED2 = vec2(0.1234, 0.5678);

const float PI = 3.1415926;

/* ----------------------------------------------------------------------------------------- *
 *     Util Functions
 * ----------------------------------------------------------------------------------------- */

float cubicFalloff(float t) {
    return t * t * (3.0 - 2.0 * t);
}

/* ----------------------------------------------------------------------------------------- *
 *     Noise Functions
 * ----------------------------------------------------------------------------------------- */

float random1(vec2 p, vec2 seed) {
    return fract(sin(dot(p + seed, vec2(127.1, 311.7))) * 43758.5453);
}

float random1(vec3 p, vec3 seed) {
    return fract(sin(dot(p + seed, vec3(987.654, 123.456, 531.975))) * 85734.3545);
}

vec2 random2(vec2 p, vec2 seed) {
    return fract(sin(vec2(dot(p + seed, vec2(311.7, 127.1)), dot(p + seed, vec2(269.5, 183.3)))) * 85734.3545);
}

float brownianNoise(vec2 noisePos, vec2 seed) {
    vec2 boxPos = vec2(floor(noisePos.x), floor(noisePos.y));

    // Get the noise at the corners of the cells
    float corner0 = random1(boxPos + vec2(0.0, 0.0), seed);
    float corner1 = random1(boxPos + vec2(1.0, 0.0), seed);
    float corner2 = random1(boxPos + vec2(0.0, 1.0), seed);
    float corner3 = random1(boxPos + vec2(1.0, 1.0), seed);

    // Get cubic interpolation factors
    float tx = smoothstep(0.0, 1.0, fract(noisePos.x));
    float ty = smoothstep(0.0, 1.0, fract(noisePos.y));

    // Perform bicubic interpolation
    return mix(mix(corner0, corner1, tx), mix(corner2, corner3, tx), ty);
}

float fbm(vec2 noisePos, int numOctaves, float startFrequency, vec2 seed) {
    float totalNoise = 0.0;
    float normalizer = 0.0;
    const float PERSISTENCE = 0.5;

    float frequency = startFrequency;
    float amplitude = PERSISTENCE;

    for (int i = 0; i < numOctaves; i++) {
        normalizer += amplitude;
        totalNoise += brownianNoise(noisePos * frequency, seed) * amplitude;
        frequency *= 2.0;
        amplitude *= PERSISTENCE;
    }
    return totalNoise / normalizer;
}

void main() {
    vec2 noisePos = vs_Pos.xz + u_PlanePos;

    const float COAST_SIZE = 0.075;
    float isLand = fbm(noisePos, 3, 0.05, SEED2);
    float vertHeight =
        isLand > u_LandRatio - 0.00000000 ? -0.5:
        isLand > u_LandRatio - COAST_SIZE ? mix(-0.5, 0.5, cubicFalloff((u_LandRatio - isLand) / COAST_SIZE)):
        0.5;

    /*
        isLand > u_LandRatio -0.5 : 
        isLand > u_LandRatio ? mix(-0.5, 0.5, cubicFalloff((isLand - u_LandRatio - COAST_SIZE) / COAST_SIZE)) :
        0.5;*/

    vec4 modelposition = vec4(vs_Pos.x, vertHeight, vs_Pos.z, 1);
    fs_Pos = vec3(noisePos.x, vertHeight, noisePos.y);

    modelposition = u_Model * modelposition;
    gl_Position = u_ViewProj * modelposition;
}
