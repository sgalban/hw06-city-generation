#version 300 es
precision highp float;

uniform vec2 u_PlanePos; // Our location in the virtual world displayed by the plane
uniform highp int u_Time;
uniform highp int u_UseLight;
uniform highp int u_ShowPop;
uniform vec3 u_Eye, u_Ref, u_Up;

in vec3 fs_Pos;
in vec3 fs_Nor;
in vec4 fs_Col;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

const vec2 SEED1 = vec2(0.3141, 0.6456);
const vec2 SEED2 = vec2(0.4112, 0.9382);

const float PI = 3.1415926;

const vec4 lights[3] = vec4[3](
    vec4(0, -0.2588190451, -0.96592582628, 0.5),
    vec4(0, -1, 0, 0.1),
    vec4(1, 0, 0, 0)
);

const vec3 lightColors[3] = vec3[3](
    vec3(0.2, 0.2, 0),
    vec3(0.8, 0.8, 1),
    vec3(1, 1, 0)
);

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

vec3 calculateLambert(vec3 baseColor) {
    vec3 newColor = vec3(0);
    for (int i = 0; i < 3; i++) {
        vec4 curLight = lights[i];
        vec3 lightColor = lightColors[i];
        newColor += dot(fs_Nor, curLight.xyz) * lightColor * baseColor * curLight.w;
    }

    return clamp(newColor, vec3(0), vec3(1));
}

float calculateSpecular() {
    vec3 halfDir = normalize(lights[0].xyz - fs_Pos + u_Eye);
    float specAngle = max(dot(halfDir, vec3(0, 1, 0)), 0.0);
    float specular = pow(specAngle, 4.0);
    return specular;
}

void main() {
    vec2 noisePos = fs_Pos.xz + u_PlanePos;

    vec3 WATER = vec3(0, 0, 0.3);
    WATER = WATER + calculateSpecular() * vec3(lightColors[0]);
    const vec3 TIDE  = vec3(0.1, 0.2, 0.5);
    const vec3 SAND  = vec3(0.3, 0.3, 0.5);
    const vec3 LAND  = vec3(0.05, 0.1, 0.075);
    const vec3 SKY   = vec3(0, 0, 0.05);//vec3(0.64, 0.91, 1.0);

    float height = fs_Pos.y;

    vec3 terrainColor =
        height < -0.49 ? WATER:
        height < -0.25 ? mix(WATER, TIDE, smoothstep(0.0, 1.0, height * 4.0 + 2.0)):
        height < +0.00 ? mix(TIDE, SAND, smoothstep(0.0, 1.0, height * 4.0 + 1.0)):
        height < +0.49 ? mix(SAND, LAND, smoothstep(0.0, 1.0, height * 2.0)):
        LAND;

    float populationDensity = height < 0.4 ? 0.0 : pow(fbm(noisePos, 2, 0.08, SEED2), 2.0);

    const vec3 POP_COLOR = vec3(1, 0, 0);
    vec3 color = u_ShowPop == 0 ? terrainColor : mix(terrainColor, POP_COLOR, populationDensity);

    color = mix(color, SKY, smoothstep(0.0, 1.0, clamp((length(fs_Pos.xz) - 45.0) / 5.0, 0.0, 1.0)));

    out_Col = vec4(color, 1.0);
}
