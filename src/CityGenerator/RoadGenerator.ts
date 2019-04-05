import {vec2, vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import GeoData from './GeoData';
import SpatialGraph, {Node} from './SpatialGraph';
import Turtle from './Turtle';
import {getIntersection, fract} from '../util';

const ROAD_HIGHWAY = 0;
const ROAD_STREET = 1;

export default class RoadGenerator {
    geoData: GeoData;
    roadNetwork: SpatialGraph;
    turtle: Turtle;
    snapRadius: number;
    currentSeed: vec2;
    mapSize: number
    openTiles: string[];

    constructor(_geoData: GeoData, _mapSize: number) {
        this.geoData = _geoData;
        this.roadNetwork = new SpatialGraph();
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

    private findBestAngle(turtle: Turtle) {
        // Non-highways always go straight (unless they branch)
        if (turtle.type === ROAD_STREET) {
            return 0;
        }
        const SPREAD_ANGLE = 60; // The max spread of angles at which we will sample
        const ANGLE_SAMPLES = 7; // The total number of angles sampled
        const SAMPLE_LENGTH = 50; // The distance traveled per angle
        let curBestAngle = 0;
        let highestDirectionWeight = -1000;
        for (let i = 0; i < ANGLE_SAMPLES; i++) {
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
        return curBestAngle;
    }

    generateHighways(maxIterations: number): void {
        this.resetSeeds();
        this.roadNetwork = new SpatialGraph();

        let startingPoint: vec2 = this.getStartingPoint();
        let startingNode: Node = new Node(startingPoint, ROAD_HIGHWAY);
        let highwayTurtles: Turtle[] = [
            Turtle.turtleFrom(startingNode, 0),
            Turtle.turtleFrom(startingNode, 90),
            Turtle.turtleFrom(startingNode, 180),
            Turtle.turtleFrom(startingNode, 270)
        ];
        let streetTurtles: Turtle[] = [];
        this.roadNetwork.addNode(startingNode);

        let numRoadsGenerated = 0;

        const MAX_CORRECTION_ANGLE = 120;
        const ROTATION_STEPS = 15;
        const HIGHWAY_SEGMENT_LENGTH = 3;
        const STREET_SEGMENT_LENGTH = 1;
        const MIN_PRUNE_LENGTH = 1;

        const HIGHWAY_BRANCH_PROBABILITY = 0.2;
        const STREET_BRANCH_PROBABILITY = 0.4
        const STREET_FORMATION_PROBABILITY = 0.5;

        const MAX_EXTENSION = 5;
        const SNAP_RADIUS = 0.5;

        let ITERATION_LIMIT = 100;
        let numIterations = 0;
        while(highwayTurtles.length > 0 || streetTurtles.length > 0) {
            if (numIterations > maxIterations) {
                break;
            }
            for (let turtle of (highwayTurtles.concat(streetTurtles))) {
                numIterations++;
                if (numIterations > maxIterations) {
                    break;
                }

                // This is the node we're going to extend from
                let lastNode = turtle.node;

                // ------------------------------------------------------------------------------
                // First, we want to get the direction of the next road segment
                // ------------------------------------------------------------------------------
                let proposedAngle = this.findBestAngle(turtle);
                let proposedLength = HIGHWAY_SEGMENT_LENGTH;

                // ------------------------------------------------------------------------------
                // Now that we have the direction, we must rotate to ensure that the road does
                // not end up in an illegal area
                // ------------------------------------------------------------------------------

                // We set a bunch of flags here to handle what this turtle is actually going to end
                // up doing
                let endBranch = false;
                let makeNewNode = true;
                let splitEdge = false;
                let splitNode1 = null;
                let splitNode2 = null;

                let proposedPos: vec2 = turtle.dryMove(proposedAngle, proposedLength);
                let isIllegal: boolean = this.geoData.getPopulationDensity(proposedPos) < 0;

                if (isIllegal) {
                    // We don't even attempt to adjust the road unless it's a highway
                    let foundCorrection = false;
                    if (turtle.type === ROAD_HIGHWAY) {

                        // First we try rotating the highway back into a good area
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

                        // If that doesn't work, we try extending it
                        if (!foundCorrection) {
                            let samplePos: vec2 = turtle.dryMove(proposedAngle, proposedLength * 2.5);
                            for (let ext = 1; ext < proposedLength * 2; ext++) {
                                let samplePos: vec2 = turtle.dryMove(proposedAngle, proposedLength + ext);
                                if (this.geoData.getPopulationDensity(samplePos) >= 0) {
                                    proposedLength += ext;
                                    foundCorrection = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (!foundCorrection) {
                        endBranch = true;
                        makeNewNode = false;
                    }
                }
                proposedPos = turtle.dryMove(proposedAngle, proposedLength);

                // We won't actually use this node in the graph. Only for intersection testing purposes
                // We give it a -1, since the type won't matter
                let testNode: Node = new Node(proposedPos, -1);

                // ------------------------------------------------------------------------------
                // Now we check whether or not the new proposed segment intersects with any
                // existing ones. If it does, we truncate it and end the growth. It doesn't
                // matter which type we are
                // ------------------------------------------------------------------------------   
                if (!endBranch) {
                    let checkRadius = Math.max(HIGHWAY_SEGMENT_LENGTH, STREET_SEGMENT_LENGTH);
                    for (let node of this.roadNetwork.getNodesNear(testNode, checkRadius)) {
                        for (let neighbor of this.roadNetwork.getAdjacentNodes(node)) {
                            let edgeType = node.type === neighbor.type ? node.type : ROAD_HIGHWAY;
                            let intersection: vec2 =
                                getIntersection(lastNode.position, proposedPos, node.position,neighbor.position);
                            if (intersection && (turtle.type === ROAD_STREET || edgeType === ROAD_HIGHWAY)) {
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
                // with that one instead. Again, doesn't matter which type we're using
                // ------------------------------------------------------------------------------
                if (!endBranch) {
                    let shortestDistance = 10000000;
                    let closestNode: Node = null;
                    for (let node of this.roadNetwork.getNodesNear(new Node(proposedPos, -1), SNAP_RADIUS)) {
                        if (turtle.type === ROAD_STREET || node.type === ROAD_HIGHWAY) {
                            let distance = vec2.distance(proposedPos, node.position);
                            if (distance < shortestDistance) {
                                shortestDistance = distance;
                                closestNode = node;
                                endBranch = true;
                                makeNewNode = false;
                            }
                        }
                    }
                    if (closestNode) {
                        this.roadNetwork.connect(lastNode, closestNode);
                        numRoadsGenerated++;
                    }
                }

                // ------------------------------------------------------------------------------
                // Now we check if the road almost intersects with another road, and if it does,
                // we extend it
                // ------------------------------------------------------------------------------
                if (!endBranch) {
                    let adjustedPos = turtle.dryMove(proposedAngle, proposedLength + MAX_EXTENSION);
                    let adjustedLength = MAX_EXTENSION;
                    for (let node of this.roadNetwork.getNodesNear(testNode, HIGHWAY_SEGMENT_LENGTH)) {
                        for (let neighbor of this.roadNetwork.getAdjacentNodes(node)) {
                            let edgeType = node.type === neighbor.type ? node.type : ROAD_HIGHWAY;
                            let intersection: vec2 =
                                getIntersection(lastNode.position, adjustedPos, node.position, neighbor.position);
                            if (intersection && (turtle.type === ROAD_STREET || edgeType === ROAD_HIGHWAY)) {
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
                    this.roadNetwork.connect(lastNode, newNode);
                    if (splitEdge) {
                        this.roadNetwork.splitEdge(splitNode1, splitNode2, newNode);
                    }

                    numRoadsGenerated++;
                }

                // ------------------------------------------------------------------------------
                // If the current road has stopped growing, start making a new one. This can
                // either mean starting a new road altogether, or branching off of an existing
                // node
                // ------------------------------------------------------------------------------

                if (endBranch) {
                    if (turtle.type === ROAD_HIGHWAY) {
                        let idx = highwayTurtles.indexOf(turtle);
                        if (idx >= 0) {
                            highwayTurtles.splice(idx, 1);
                        }
                    }
                    else if (turtle.type === ROAD_STREET) {
                        let idx = streetTurtles.indexOf(turtle);
                        if (idx >= 0) {
                            streetTurtles.splice(idx, 1);
                        }
                    }
                }
                else {
                    // With a certain probablility, branch the road at a 90 deg angle
                    let random = this.generateRandomNumber();
                    if (turtle.type === ROAD_HIGHWAY && random < HIGHWAY_BRANCH_PROBABILITY) {
                        let branchTurtle = turtle.duplicate();
                        branchTurtle.rotate(90);
                        if (random < HIGHWAY_BRANCH_PROBABILITY * STREET_FORMATION_PROBABILITY) {
                            branchTurtle.type = ROAD_STREET
                            streetTurtles.push(branchTurtle);
                        }
                        else {
                            highwayTurtles.push(branchTurtle);
                        }
                    }
                    else if (turtle.type === ROAD_STREET && random < STREET_BRANCH_PROBABILITY) {
                        let branchTurtle = turtle.duplicate();
                        branchTurtle.rotate(90);
                        streetTurtles.push(branchTurtle);
                    }
                }
            }
        }
    }


    drawRoadNetwork(road: Drawable, highwayThickness: number): void {
        let seenEdges = new Set();
        let numRoads = 0;
        let numStreets = 0;
        let endpoints: vec4[] = [];
        let roadThicknesses: number[] = [];
        let streetThickness = highwayThickness / 3.0;

        for (let node of this.roadNetwork.getNodeIterator()) {
            for (let neighbor of this.roadNetwork.getAdjacentNodes(node)) {
                if (!seenEdges.has([node.x, node.y, neighbor.x, neighbor.y].toString())) {
                    seenEdges.add([node.x, node.y, neighbor.x, neighbor.y].toString());
                    seenEdges.add([neighbor.x, neighbor.y, node.x, node.y].toString());
                    endpoints = endpoints.concat(vec4.fromValues(node.x, node.y, neighbor.x, neighbor.y));
                    numRoads++;

                    let roadType = node.type === neighbor.type ? node.type : ROAD_STREET;
                    roadThicknesses.push(roadType === ROAD_HIGHWAY ? highwayThickness : streetThickness);
                }
            }
        }

        road.setInstanceVBOs(endpoints, roadThicknesses);
        road.setNumInstances(numRoads);
    }
}