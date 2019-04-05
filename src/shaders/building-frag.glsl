#version 300 es
precision highp float;

uniform highp int u_Time;
uniform vec2 u_PlanePos;

in vec3 fs_Pos;
in vec4 fs_Nor;
in vec4 fs_Col;

out vec4 out_Col;

void main() {
    const vec3 SKY   = vec3(0.64, 0.91, 1.0);
    
    vec3 color = vec3(0.9);

    vec3 lightDir = normalize(vec3(0.3, -1, -0.9));
    color = color * dot(lightDir, fs_Nor.xyz);
    color = mix(color, SKY, smoothstep(0.0, 1.0, clamp((length(fs_Pos.xz) - 45.0) / 5.0, 0.0, 1.0)));
    out_Col = vec4(color, 1.0);
}