#version 300 es
precision highp float;

uniform mat4 u_Model;
uniform mat4 u_ModelInvTr;
uniform mat4 u_ViewProj;
uniform vec2 u_PlanePos;
uniform float u_LandRatio;

in vec4 vs_Pos;
in vec4 vs_Nor;
in vec4 vs_Col;

out vec3 fs_Pos;
out vec4 fs_Nor;
out vec4 fs_Col;

void main() {
    fs_Pos = vs_Pos.xyz;
    vec4 modelposition = u_Model * vs_Pos;
    gl_Position = u_ViewProj * modelposition;
}