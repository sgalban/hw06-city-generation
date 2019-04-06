#version 300 es
precision highp float;

uniform highp int u_Time;
uniform vec2 u_PlanePos;
uniform vec3 u_Eye, u_Ref, u_Up;

in vec3 fs_Pos;
in vec4 fs_Nor;
in vec4 fs_Col;

out vec4 out_Col;

const vec4 lights[3] = vec4[3](
    vec4(0, -0.2588190451, -0.96592582628, 0.5),
    vec4(0, -1, 0, 0.3),
    vec4(0, 0.2588190451, 0.96592582628, 1.0)
);

const vec3 lightColors[3] = vec3[3](
    vec3(1, 1, 0.7),
    vec3(0.8, 0.8, 1),
    vec3(0, 0, 1)
);

vec3 calculateLambert(vec3 baseColor) {
    vec3 newColor = vec3(0);
    for (int i = 0; i < 3; i++) {
        vec4 curLight = lights[i];
        vec3 lightColor = lightColors[i];
        vec3 nor = fs_Nor.xyz;
        float d = max(0.0, dot(nor, curLight.xyz));
        newColor += d * lightColor * baseColor * curLight.w;
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
    const vec3 SKY = vec3(0, 0, 0.05);
    
    vec3 color = vec3(0.9);

    vec3 lightDir = normalize(vec3(0.3, -1, -0.9));
    color = color * dot(lightDir, fs_Nor.xyz);
    color = calculateLambert(color);

    color = mix(color, SKY, smoothstep(0.0, 1.0, clamp((length(fs_Pos.xz) - 45.0) / 5.0, 0.0, 1.0)));
    out_Col = vec4(color, 1.0);
}