#version 300 es
precision highp float;
uniform int u_Time;
uniform vec3 u_Eye, u_Ref, u_Up;
uniform vec2 u_Dimensions;

const float FOV = 45.1;

const vec2 SEED1 = vec2(0.3141, 0.6456);
const vec2 SEED2 = vec2(0.4112, 0.9382);

const float PI = 3.1415926;

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

float cubicFalloff(float t) {
    return t * t * (3.0 - 2.0 * t);
}

float worley(vec2 noisePos, float frequency) {
    vec2 point = noisePos * frequency;
    vec2 cell = floor(point);

    // Check the neighboring cells for the closest cell point
    float closestDistance = 2.0;
    for (int i = 0; i < 9; i++) {
        vec2 curCell = cell + vec2(i % 3 - 1, floor(float(i / 3) - 1.0));
        vec2 cellPoint = vec2(curCell) + random2(vec2(curCell), SEED2);
        closestDistance = min(closestDistance, distance(cellPoint, point));
    }
    return clamp(0.0, 1.0, closestDistance);
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

// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

in vec3 fs_Pos;
out vec4 out_Col;

void main() {
    vec3 forward = normalize(u_Ref - u_Eye);
    vec3 right = normalize(cross(forward, u_Up));
    float refDist = length(u_Ref - u_Eye);
    float verticalAngle = tan(FOV / 2.0);
    float aspectRatio = u_Dimensions.x / u_Dimensions.y;
    vec3 V = u_Up * refDist * verticalAngle;
    vec3 H = right * refDist * aspectRatio * verticalAngle;
    vec3 worldPoint = u_Ref + H * fs_Pos.x + V * fs_Pos.y;
    vec3 rayDir = normalize(worldPoint - u_Eye);

    vec3 moon = mix(vec3(1.0, 1.0, 0.9), vec3(0.7, 0.7, 0.6), fbm(rayDir.xy, 2, 15.0, SEED2));

    float theta = acos(rayDir.z);
    float phi = atan(rayDir.y, rayDir.x);

    float starNoise = worley(vec2(theta, phi), 5.0);
    vec3 color = starNoise < 0.008 ? vec3(1.0, 1.0, 0.7) : vec3(0, 0, 0.05);

    color =
        distance(rayDir, vec3(0, 0, -1)) < 0.29 ? moon :
        distance(rayDir, vec3(0, 0, -1)) < 0.3 ? mix(moon, color, (distance(rayDir, vec3(0, 0, -1)) - 0.29) / 0.01) :
        color;
    out_Col = vec4(color, 1.0);
}
