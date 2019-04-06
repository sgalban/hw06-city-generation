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

in vec4 vs_Endpoints;
in float vs_Thickness;

out vec3 fs_Pos;
out vec4 fs_Nor;
out vec4 fs_Col;

void main() {
    vec2 end1 = vec2(vs_Endpoints.x, vs_Endpoints.y);
    vec2 end2 = vec2(vs_Endpoints.z, vs_Endpoints.w);
    vec2 direction = normalize(end2 - end1);
    float angle = atan(direction.y, direction.x);
    float length = distance(end1, end2);
    mat2 rotation = mat2(
        vec2(cos(angle), sin(angle)),
        vec2(-sin(angle), cos(angle))
    );

    vec2 pos = vs_Pos.xz;
    pos = vec2(pos.x * length, pos.y * vs_Thickness);
    pos = rotation * pos;
    pos += (end1 + end2) / 2.0;

    vec4 modifiedPos = vec4(pos.x, vs_Pos.y * 0.05 + 0.5, pos.y, 1.0) - vec4(u_PlanePos.x, 0, u_PlanePos.y, 0);
    fs_Pos = modifiedPos.xyz;
    vec4 modelposition = u_Model * modifiedPos;
    gl_Position = u_ViewProj * modelposition;
}