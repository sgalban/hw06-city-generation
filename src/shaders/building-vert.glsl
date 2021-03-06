#version 300 es
precision highp float;

uniform mat4 u_Model;
uniform mat4 u_ModelInvTr;
uniform mat4 u_ViewProj;
uniform vec2 u_PlanePos;
uniform float u_LandRatio;

in vec4 vs_Pos;
in vec4 vs_Nor;
in vec4 vs_Offset;
in float vs_Height;
in float vs_Thickness;

out vec3 fs_Pos;
out vec4 fs_Nor;

void main() {
    vec4 actualPos = vec4(vs_Pos.x * vs_Thickness, vs_Pos.y * vs_Height, vs_Pos.z * vs_Thickness, 1);
    actualPos += (vs_Offset - vec4(u_PlanePos.x, 0, u_PlanePos.y, 0));
    vec4 modelposition = u_Model * actualPos;
    fs_Pos = modelposition.xyz;
    fs_Nor = vs_Nor;

    gl_Position = u_ViewProj * modelposition;
}