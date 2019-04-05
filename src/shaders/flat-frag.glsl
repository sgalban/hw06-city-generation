#version 300 es
precision highp float;
uniform int u_Time;

// The fragment shader used to render the background of the scene
// Modify this to make your background more interesting

out vec4 out_Col;


void main() {
    vec3 color = vec3(0.5, 0.3, 1.0);
    out_Col = vec4(color, 1.0);
}
