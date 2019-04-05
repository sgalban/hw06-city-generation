import {vec2, vec3, vec4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';

import Square from './geometry/Square';
import Plane from './geometry/Plane';
import Cube from './geometry/Cube';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

import Camera from './Camera';
import {setGL} from './globals';

import GeoData from './CityGenerator/GeoData';
import RoadGenerator from './CityGenerator/RoadGenerator';


// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
    "Show Population": false,
    "Land-Water Ratio": 0.6,
    "Road Count": 10,
};

const TSEED: vec2 = vec2.fromValues(0.1234, 0.5678);
const PSEED: vec2 = vec2.fromValues(0.4112, 0.9382);

const MAP_SIZE: number = 50;

let square: Square;
let plane : Plane;
let cube: Cube;

let geoData: GeoData;
let roadGenerator: RoadGenerator;

let wPressed: boolean;
let aPressed: boolean;
let sPressed: boolean;
let dPressed: boolean;
let planePos: vec2;
let time: number;

function clamp(value: number, min: number, max: number): number {
    return Math.max(Math.min(value, max), min);
}

function loadScene() {
    square = new Square(vec3.fromValues(0, 0, 0));
    square.create();
    plane = new Plane(vec3.fromValues(0,0,0), vec2.fromValues(100,100), 20);
    plane.create();
    cube = new Cube(vec3.fromValues(0, 0, 0));
    cube.create();
  
    geoData = new GeoData(TSEED, PSEED, controls["Land-Water Ratio"], MAP_SIZE);
    roadGenerator = new RoadGenerator(geoData, MAP_SIZE);
  
    roadGenerator.generateHighways(controls["Road Count"]);
    roadGenerator.drawRoadNetwork(cube, 0.2);
  
    wPressed = false;
    aPressed = false;
    sPressed = false;
    dPressed = false;
    planePos = vec2.fromValues(0,0);
  
    time = 0;
}

function main() {
    window.addEventListener('keypress', function (e) {
      // console.log(e.key);
        switch(e.key) {
            case 'w':
            wPressed = true;
            break;
            case 'a':
            aPressed = true;
            break;
            case 's':
            sPressed = true;
            break;
            case 'd':
            dPressed = true;
            break;
        }
    }, false);
  
    window.addEventListener('keyup', function (e) {
        switch(e.key) {
            case 'w':
            wPressed = false;
            break;
            case 'a':
            aPressed = false;
            break;
            case 's':
            sPressed = false;
            break;
            case 'd':
            dPressed = false;
            break;
        }
    }, false);
  
    // Initial display for framerate
    const stats = Stats();
    stats.setMode(0);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);
  
    // Add controls to the gui
    const gui = new DAT.GUI();
    gui.add(controls, "Land-Water Ratio", 0.0, 1.0);
    gui.add(controls, "Show Population");
    gui.add(controls, "Road Count", 0, 400);
  
    // get canvas and webgl context
    const canvas = <HTMLCanvasElement> document.getElementById('canvas');
    const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
    if (!gl) {
        alert('WebGL 2 not supported!');
    }
    // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
    // Later, we can import `gl` from `globals.ts` to access it
    setGL(gl);
  
    // Initial call to load scene
    loadScene();
  
    const camera = new Camera(vec3.fromValues(0, 10, -20), vec3.fromValues(0, 0, 0));
  
    const renderer = new OpenGLRenderer(canvas);
    renderer.setClearColor(0.64, 0.91, 1.0, 1);
    gl.enable(gl.DEPTH_TEST);
  
    const lambert = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/terrain-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/terrain-frag.glsl')),
    ]);
  
    const flat = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
    ]);

    const road = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/road-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/road-frag.glsl')),
    ]);
  
    function processKeyPresses() {
        let velocity: vec2 = vec2.fromValues(0,0);
        if(wPressed) {
            velocity[1] += 1.0;
        }
        if(aPressed) {
            velocity[0] += 1.0;
        }
        if(sPressed) {
            velocity[1] -= 1.0;
        }
        if(dPressed) {
            velocity[0] -= 1.0;
        }
        let newPos: vec2 = vec2.fromValues(0,0);
        vec2.add(newPos, velocity, planePos);
        newPos = vec2.fromValues(
            clamp(newPos[0], -MAP_SIZE - 10, MAP_SIZE + 10),
            clamp(newPos[1], -MAP_SIZE - 10, MAP_SIZE + 10)
        );
        lambert.setPlanePos(newPos);
        road.setPlanePos(newPos);
        planePos = newPos;
    }

    let lastRoadCount = controls["Road Count"];
    let lastLandRatio = controls["Land-Water Ratio"];
  
    // This function will be called every frame
    function tick() {
        camera.update();
        stats.begin();
        gl.viewport(0, 0, window.innerWidth, window.innerHeight);

        if (controls["Road Count"] !== lastRoadCount || controls["Land-Water Ratio"] != lastLandRatio) {
            lastRoadCount = controls["Road Count"];
            lastLandRatio = controls["Land-Water Ratio"];
            roadGenerator.generateHighways(controls["Road Count"]);
            roadGenerator.drawRoadNetwork(cube, 0.2);
        }

        geoData.setLandRatio(controls["Land-Water Ratio"]);
    
        flat.setTime(time);
        lambert.setTime(time);
        road.setTime(time);

        lambert.setWaterRatio(controls["Land-Water Ratio"]);
        lambert.setShowPop(controls["Show Population"]);
    
        time += 1.0
    
        renderer.clear();
        processKeyPresses();

        renderer.render(camera, lambert, [
            plane,
        ]);
        renderer.render(camera, flat, [
            square,
        ]);
        renderer.render(camera, road, [
            cube,
        ])
        stats.end();
    
        // Tell the browser to call `tick` again whenever it renders a new frame
        requestAnimationFrame(tick);
    }
  
    window.addEventListener('resize', function() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.setAspectRatio(window.innerWidth / window.innerHeight);
        camera.updateProjectionMatrix();
    }, false);
  
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  
    // Start the render loop
    tick();
}

main();
