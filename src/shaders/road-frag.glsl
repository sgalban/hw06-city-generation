#version 300 es
precision highp float;

uniform highp int u_Time;

in vec3 fs_Pos;
in vec4 fs_Nor;
in vec4 fs_Col;

out vec4 out_Col;

void main() {
    vec3 color = vec3(0.3, 0.3, 0.4);
    out_Col = vec4(color, 1.0);
}