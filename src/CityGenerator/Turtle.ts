import {vec2, vec3, quat, mat4} from 'gl-matrix';
import {Node} from './SpatialGraph';

const ROAD_HIGHWAY = 0;
const ROAD_STREET = 1;

export default class Turtle {
    position: vec2;
    node: Node;
    angle: number;
    type: number;

    constructor(_type: number) {
        this.position = vec2.fromValues(0, 0);
        this.angle = 0;
        this.node = null;
        this.type = _type;
    }

    static turtleFrom(node: Node, angle: number): Turtle {
        let turtle = new Turtle(node.type);
        turtle.setAngle(angle);
        turtle.setNode(node);
        turtle.setPosition(node.position);
        return turtle;
    }

    setPosition(pos: vec2): void {
        this.position = vec2.fromValues(pos[0], pos[1]);
    }

    setAngle(angle: number): void {
        this.angle = angle;
    }

    setNode(node: Node) : void {
        this.node = node;
    }
    
    duplicate(): Turtle {
        let copy : Turtle = new Turtle(this.type);
        copy.position = vec2.clone(this.position);
        copy.angle = this.angle;
        copy.node = this.node;
        return copy;
    }

    rotate(amount: number): void {
        this.angle = (this.angle + amount) % 360;
    }

    moveForward(amount: number): void {
        let radians = this.angle * Math.PI / 180.0;
        let delta: vec2 = vec2.fromValues(amount * Math.cos(radians), amount * Math.sin(radians));
        vec2.add(this.position, this.position, delta);
    }

    dryMove(angle: number, amount: number): vec2 {
        let radians = (this.angle + angle) * Math.PI / 180.0;
        let delta: vec2 = vec2.fromValues(amount * Math.cos(radians), amount * Math.sin(radians));
        return vec2.add(vec2.create(), this.position, delta);
    }

    makeNode(): Node {
        let newNode = new Node(this.position, this.type);
        this.node = newNode;
        return this.node;
    }
}