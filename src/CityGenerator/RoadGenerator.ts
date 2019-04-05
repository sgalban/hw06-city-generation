import {vec2, vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import GeoData from './GeoData';
import SpatialGraph, {Node} from './SpatialGraph';
import Turtle from './Turtle';

function fract(x: number) : number {
    return x - Math.floor(x);
}

function between(val: number, min: number, max: number): boolean {
    if (max < min) {
        [min, max] = [max, min];
    }
    return val > min && val < max;
}

function normal(val: number): boolean {
    return val >= 0 && val <= 1;
}

function lerp(start: vec2 | number[], end: vec2 | number[], t: number): vec2 {
    let [x1, y1] = [start[0], start[1]];
    let [x2, y2] = [end[0], end[1]];
    return vec2.fromValues((t - 1) * x1 + t * x2, (t - 1) * y1 + t * y2);
}

function unlerp(start: number, end: number, value: number): number {
    return (value - start) / (end - start);
}

function getIntersection(
    start1: vec2 | number[],
    end1: vec2 | number[],
    start2: vec2 | number[],
    end2: vec2 | number[]
) : vec2 {

    // Handle vertical cases
    if (start1[0] === end1[0] && start2[0] === end2[0]) {
        return null;
    }
    else if (start1[0] === end1[0]) {
        const m2 = (start2[1] - end2[1]) / (start2[0] - end2[0]);
        const intersection = vec2.fromValues(start1[0], m2 * (start1[0] - start2[0]) + start2[1]);
        if (between(intersection[0], start2[0], end2[0]) && between(intersection[1], start1[1], end1[1])) {
            return intersection;
        }
        else {
            return null;
        }
    }
    else if (start2[0] === end2[0]) {
        const m1 = (start1[1] - end1[1]) / (start1[0] - end1[0]);
        const intersection = vec2.fromValues(start2[0], m1 * (start2[0] - start1[0]) + start1[1]);
        if (between(intersection[0], start1[0], end1[0]) && between(intersection[1], start2[1], end2[1])) {
            return intersection;
        }
        else {
            return null;
        }
    }

    // Handle all other cases
    const m1 = (start1[1] - end1[1]) / (start1[0] - end1[0]);
    const m2 = (start2[1] - end2[1]) / (start2[0] - end2[0]);
    const x1 = start1[0];
    const y1 = start1[1];
    const x2 = start2[0];
    const y2 = start2[1];
    if (m1 === m2) {
        return null;
    }
    const x = (m1 * x1 - m2 * x2 - y1 + y2) / (m1 - m2);
    const y = m1 * (x - x1) + y1;
    if (
        between(x, start1[0], end1[0]) && between(x, start2[0], end2[0]) && 
        between(y, start1[1], end1[1]) && between(y, start2[1], end2[1])
    ) {
        return vec2.fromValues(x, y);
    }
    else {
        return null;
    }

}

export default class RoadGenerator {
    geoData: GeoData;
    highwayNetwork: SpatialGraph;
    turtle: Turtle;
    snapRadius: number;
    currentSeed: vec2;
    mapSize: number
    openTiles: string[];

    constructor(_geoData: GeoData, _mapSize: number) {
        this.geoData = _geoData;
        this.highwayNetwork = new SpatialGraph();
        this.turtle = new Turtle();
        this.snapRadius = 3.0;
        this.currentSeed = vec2.fromValues(0.46123, 0.93452);
        this.mapSize = _mapSize;

        // In order to efficiently find an arbitrary number of points to start a new road branch,
        // I am dividing the map up into 10-unit tiles, and tracking each one. If it's an invalid tile
        // or has already been used a starting point, it won't be selected
        this.openTiles = [];
        const incSize = Math.floor(_mapSize / 5);
        for (let x = -_mapSize; x < _mapSize; x += incSize) {
            for (let y = -_mapSize; y < _mapSize; y += incSize) {
                if (this.geoData.isLand([x, y])) {
                    const key = x + "|" + y;
                    this.openTiles.push(key);
                }
            }
        }
    }

    generateRandomNumber(min: number = 0, max: number = 1): number {
        let rng: number = fract(Math.sin(
            vec2.dot(this.currentSeed, vec2.fromValues(127.1, 311.7))
        ) * 45249.14523);
        vec2.add(this.currentSeed, this.currentSeed, vec2.fromValues(rng, 0));
        rng === 1.0 ? 0.9999 : rng;
        return min + (max - min) * rng;
    }

    getStartingPoint(): vec2 {
        if (this.openTiles.length === 0) {
            return null;
        }
        const r1 = Math.floor(this.generateRandomNumber(0, this.openTiles.length));
        let chosenTile = this.openTiles[r1];
        let [x, y] = chosenTile.split("|").map(s => parseInt(s));
        const idx = this.openTiles.indexOf(chosenTile);
        if (idx > -1) {
            //this.openTiles.splice(idx, 1);
        }
        const tileSize = Math.floor(this.mapSize / 5);
        let position: vec2;
        do {
            position = vec2.fromValues(
                x + this.generateRandomNumber(0, tileSize),
                y + this.generateRandomNumber(0, tileSize)
            );
        } while (this.geoData.getPopulationDensity(position) <= 0);
        return position;
    }

    resetSeeds() {
        this.currentSeed = vec2.fromValues(0.46123, 0.93452)
    }

    generateHighways(maxRoads: number): void {
        this.resetSeeds();
        this.highwayNetwork = new SpatialGraph();
        let turtle: Turtle = new Turtle();

        let startingPoint: vec2 = this.getStartingPoint();
        turtle.setPosition(startingPoint);
        this.highwayNetwork.addNode(turtle.makeNode());

        let numRoadsGenerated = 0;

        const POP_SAMPLES = 7;
        const SPREAD_ANGLE = 90;
        const SAMPLE_LENGTH = 50;

        const MAX_CORRECTION_ANGLE = 70;
        const ROTATION_STEPS = 5;
        const HIGHWAY_SEGMENT_LENGTH = 5;
        const MIN_PRUNE_LENGTH = 2;

        const MAX_EXTENSION = 5;
        const SNAP_RADIUS = 3;

        while (numRoadsGenerated < maxRoads) {
            let lastNode = turtle.node;
            if (lastNode.x !== lastNode.position[0]) {
                console.log(numRoadsGenerated);
            }

            // ------------------------------------------------------------------------------
            // First, we want to get the direction of the next road segment
            // ------------------------------------------------------------------------------
            let curBestAngle = 0;
            let highestDirectionWeight = -1000;
            for (let i = 0; i < POP_SAMPLES; i++) {
                let angle = this.generateRandomNumber(-SPREAD_ANGLE / 2, SPREAD_ANGLE / 2);
                let directionWeight = 0;
                for (let distance = 1; distance <= SAMPLE_LENGTH; distance++) {
                    let samplePos: vec2 = turtle.dryMove(angle, distance);
                    directionWeight += this.geoData.getPopulationDensity(samplePos) / distance;
                }
                if (directionWeight > highestDirectionWeight) {
                    curBestAngle = angle;
                    highestDirectionWeight = directionWeight;
                }
            }
            let proposedAngle = curBestAngle;
            let proposedLength = HIGHWAY_SEGMENT_LENGTH;

            // ------------------------------------------------------------------------------
            // Now that we have the direction, we must rotate to ensure that the road does
            // not end up in an illegal area
            // ------------------------------------------------------------------------------
            let endBranch = false;
            let makeNewNode = true;
            let splitEdge = false;
            let splitNode1 = null;
            let splitNode2 = null;
            let proposedPos: vec2 = turtle.dryMove(proposedAngle, proposedLength);
            let isIllegal: boolean = this.geoData.getPopulationDensity(proposedPos) <= 0;
            if (isIllegal) {
                let foundCorrection = false;
                let angleInc = MAX_CORRECTION_ANGLE / ROTATION_STEPS;
                for (let dAngle = 0; dAngle <= MAX_CORRECTION_ANGLE; dAngle += angleInc) {
                    let samplePos1: vec2 = turtle.dryMove(proposedAngle + dAngle, proposedLength);
                    if (this.geoData.getPopulationDensity(samplePos1) >= 0) {
                        proposedAngle += dAngle
                        foundCorrection = true;
                        break;
                    }
                    let samplePos2: vec2 = turtle.dryMove(proposedAngle - dAngle, proposedLength);
                    if (this.geoData.getPopulationDensity(samplePos2) >= 0) {
                        proposedAngle -= dAngle
                        foundCorrection = true;
                        break;
                    }

                }
                if (!foundCorrection) {
                    // Try extending the highway instead
                    let samplePos: vec2 = turtle.dryMove(proposedAngle, proposedLength * 2.5);
                    for (let extensionAmount = 1; extensionAmount < proposedLength * 2; extensionAmount++) {
                        let samplePos: vec2 = turtle.dryMove(proposedAngle, proposedLength + extensionAmount);
                        if (this.geoData.getPopulationDensity(samplePos) >= 0) {
                            proposedLength += extensionAmount;
                            foundCorrection = true;
                            break;
                        }
                    }
                }
                if (!foundCorrection) {
                    endBranch = true;
                    makeNewNode = false;
                }
            }
            proposedPos = turtle.dryMove(proposedAngle, proposedLength);

            // ------------------------------------------------------------------------------
            // Now we check whether or not the new proposed segment intersects with any
            // existing ones. If it does, we truncate it and end the growth
            // ------------------------------------------------------------------------------
            
            if (!endBranch) {
                for (let node of this.highwayNetwork.getNodesNear(new Node(proposedPos), HIGHWAY_SEGMENT_LENGTH)) {
                    for (let neighbor of this.highwayNetwork.getAdjacentNodes(node)) {
                        let intersection: vec2 =
                            getIntersection(lastNode.position, proposedPos, node.position, neighbor.position);
                        if (intersection) {
                            let distance = vec2.distance(lastNode.position, intersection);
                            if (distance < proposedLength) {
                                proposedLength = distance;
                                endBranch = true;
                                splitEdge = true;
                                splitNode1 = node;
                                splitNode2 = neighbor;
                            }
                        }
                    }
                }
            }

            // ------------------------------------------------------------------------------
            // If the proposed node is really close to another node, we can just merge it
            // with that one instead
            // ------------------------------------------------------------------------------
            if (!endBranch) {
                let shortestDistance = 10000000;
                let closestNode: Node = null;
                for (let node of this.highwayNetwork.getNodesNear(new Node(proposedPos), SNAP_RADIUS)) {
                    let distance = vec2.distance(proposedPos, node.position);
                    if (distance < shortestDistance) {
                        shortestDistance = distance;
                        closestNode = node;
                        endBranch = true;
                        makeNewNode = false;
                    }
                }
                if (closestNode) {
                    this.highwayNetwork.connect(lastNode, closestNode);
                    numRoadsGenerated++;
                }
            }

            // ------------------------------------------------------------------------------
            // Now we check if the road almost intersects with another road, and if it does,
            // we extend it
            // ------------------------------------------------------------------------------
            if (!endBranch) {
                let adjustedPos = turtle.dryMove(proposedAngle, proposedLength + MAX_EXTENSION);
                let adjustedLength = 2 * MAX_EXTENSION;
                for (let node of this.highwayNetwork.getNodesNear(new Node(adjustedPos), HIGHWAY_SEGMENT_LENGTH)) {
                    for (let neighbor of this.highwayNetwork.getAdjacentNodes(node)) {
                        let intersection: vec2 =
                            getIntersection(lastNode.position, adjustedPos, node.position, neighbor.position);
                        if (intersection) {
                            let distance = vec2.distance(lastNode.position, intersection);
                            if (distance < adjustedLength) {
                                adjustedLength = distance;
                                endBranch = true;
                                splitEdge = true;
                                splitNode1 = node;
                                splitNode2 = neighbor;
                            }
                        }
                    }
                }
                if (endBranch) {
                    proposedLength = adjustedLength;
                }
            }

            // ------------------------------------------------------------------------------
            // Unless we flagged this iteration to avoid making a new node, make the new
            // node
            // ------------------------------------------------------------------------------

            if (makeNewNode) {
                turtle.rotate(proposedAngle);
                turtle.moveForward(proposedLength);
                let newNode: Node = turtle.makeNode();
                this.highwayNetwork.connect(lastNode, newNode);
                if (splitEdge) {
                    this.highwayNetwork.splitEdge(splitNode1, splitNode2, newNode);
                }

                numRoadsGenerated++;
            }

            // ------------------------------------------------------------------------------
            // If the current road has stopped growing, start making a new one. This can
            // either mean starting a new road altogether, or branching off of an existing
            // node
            // ------------------------------------------------------------------------------

            if (endBranch) {
                // Decide if we want to branch, or just find a new starting position
                let random: number = this.generateRandomNumber();

                // Start anew
                if (random > 0.8) {
                    turtle.setPosition(this.getStartingPoint());
                    turtle.makeNode();
                }

                // Branch from an existing node
                if (random <= 0.8) {
                    // Select a random node
                    let nodes: Node[] = Array.from(this.highwayNetwork.getNodeIterator());
                    let idx: number = this.generateRandomNumber(0, this.highwayNetwork.getNumNodes() - 1);
                    let selected: Node = nodes[Math.floor(idx)];
                    turtle.setNode(selected);
                    turtle.setPosition(selected.position);

                    // Find an appropriate branching angle that isn't too close to any of the others
                    let angles: number[] = [];
                    for (let neighbor of this.highwayNetwork.getAdjacentNodes(selected)) {
                        let direction: vec2 = vec2.create();
                        vec2.subtract(direction, neighbor.position, selected.position);
                        let angle = ((Math.atan2(direction[0], direction[1]) * 180 / Math.PI) + 360) % 360;
                        angles.push(angle);
                    }
                    let newAngle = 0;
                    if (angles.length === 1) {
                        newAngle = (angles[0] + 180) % 360;
                    }
                    else if (angles.length === 2) {
                        let diff = (angles[1] - angles[0] + 360) % 360;
                        newAngle = diff > 180 ? (angles[0] + angles[1]) / 2 : (angles[0] + angles[1] + 360) / 2;
                        newAngle = (newAngle + 360) % 360;
                    }
                    else {
                        angles.sort((a, b) => a - b);
                        let biggestDiff = 0;
                        let idx = -1;
                        for (let i = 0; i < angles.length; i++) {
                            let nextI = (i + 1) % angles.length;
                            let diff = (angles[nextI] - angles[i] + 360) % 360;
                            if (diff > biggestDiff) {
                                biggestDiff = diff;
                                idx = i;
                            }
                        }
                        newAngle = (angles[idx] + biggestDiff / 2 + 360) % 360;
                    }
                    turtle.setAngle(newAngle);
                }
            }
        }
    }   


    drawRoadNetwork(road: Drawable, highwayThickness: number): void {
        let seenEdges = new Set();
        let numRoads = 0;
        let endpoints: vec4[] = [];

        for (let node of this.highwayNetwork.getNodeIterator()) {
            for (let neighbor of this.highwayNetwork.getAdjacentNodes(node)) {
                if (!seenEdges.has([node.x, node.y, neighbor.x, neighbor.y].toString())) {
                    seenEdges.add([node.x, node.y, neighbor.x, neighbor.y].toString());
                    seenEdges.add([neighbor.x, neighbor.y, node.x, node.y].toString());
                    endpoints = endpoints.concat(vec4.fromValues(node.x, node.y, neighbor.x, neighbor.y));
                    numRoads++;
                }
            }
        }
        let highwayThicknesses = Array(numRoads).fill(highwayThickness);
        road.setInstanceVBOs(endpoints, highwayThicknesses);
        road.setNumInstances(numRoads);
    }
}