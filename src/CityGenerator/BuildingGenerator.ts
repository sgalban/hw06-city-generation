import {vec2, vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import GeoData from './GeoData';
import SpatialGraph, {Node} from './SpatialGraph';
import RoadGenerator from './RoadGenerator';
import Turtle from './Turtle';
import {getIntersection} from '../util';

const CELL_UNAVAILABLE = 0;
const CELL_AVAILABLE = 1;
const CELL_EMPTY = 2;

export default class BuildingGenerator {
    roadNetwork: SpatialGraph;
    roadGen: RoadGenerator;
    buildingGrid: number[][]
    availableCells : number[][];
    geoData: GeoData;
    
    constructor(_roadGen: RoadGenerator, _geoData: GeoData, mapRadius: number) {

        let markSurroundingCells = (i: number, j : number) => {
            if (i < this.buildingGrid.length - 1 && this.buildingGrid[i + 1][j] === CELL_EMPTY) {
                this.buildingGrid[i + 1][j] = CELL_AVAILABLE;
            }
            if (j < this.buildingGrid[i].length - 1 && this.buildingGrid[i][j + 1] === CELL_EMPTY) {
                this.buildingGrid[i][j + 1] = CELL_AVAILABLE;
            }
            if (i > 0 && this.buildingGrid[i - 1][j] === CELL_EMPTY) {
                this.buildingGrid[i - 1][j] = CELL_AVAILABLE;
            }
            if (j > 0 && this.buildingGrid[i][j - 1] === CELL_EMPTY) {
                this.buildingGrid[i][j - 1] = CELL_AVAILABLE;
            }
        }

        this.roadGen = _roadGen;
        this.roadNetwork = _roadGen.roadNetwork;
        this.geoData = _geoData;
        this.availableCells = [];
        this.buildingGrid = [];

        for (let i = 0; i < 2 * Math.floor(mapRadius); i++) {
            this.buildingGrid[i] = [];
            for (let j = 0; j < 2 * Math.floor(mapRadius); j++) {
                let pos: vec2 = vec2.fromValues(i - mapRadius, j - mapRadius);
                if (this.geoData.getPopulationDensity(pos) < 0) {
                    this.buildingGrid[i][j] = CELL_UNAVAILABLE;
                    this.buildingGrid[i > 0 ? i - 1 : 0][j] = CELL_UNAVAILABLE;
                    this.buildingGrid[i][j > 0 ? j - 1 : 0] = CELL_UNAVAILABLE;
                    this.buildingGrid[i > 0 ? i - 1 : 0][j > 0 ? j - 1 : 0] = CELL_UNAVAILABLE;
                }
                else {
                    this.buildingGrid[i][j] = CELL_EMPTY;
                }
            }
        }

        for (let i = 0; i < 2 * Math.floor(mapRadius); i++) {
            for (let j = 0; j < 2 * Math.floor(mapRadius); j++) {
                let pos: vec2 = vec2.fromValues(i - mapRadius, j - mapRadius);
                let testNode: Node = new Node(pos, -1);
                let checkRadius = 3;
                for (let node of this.roadNetwork.getNodesNear(testNode, checkRadius)) {
                    for (let neighbor of this.roadNetwork.getAdjacentNodes(node)) {

                        let intersection1: vec2 =
                            getIntersection(pos, [pos[0] + 1, pos[1]], node.position, neighbor.position);
                        if (intersection1) {
                            this.buildingGrid[i][j] = CELL_UNAVAILABLE;
                            markSurroundingCells(i, j);
                            if (j > 0) {
                                this.buildingGrid[i][j - 1] = CELL_UNAVAILABLE;
                                markSurroundingCells(i, j - 1);
                            }
                        }
                        let intersection2: vec2 =
                            getIntersection(pos, [pos[0], pos[1] + 1], node.position, neighbor.position);
                        if (intersection2) {
                            this.buildingGrid[i][j] = CELL_UNAVAILABLE;
                            markSurroundingCells(i, j);
                            if (i > 0) {
                                this.buildingGrid[i - 1][j] = CELL_UNAVAILABLE;
                                markSurroundingCells(i - 1, j)
                            }
                        }
                    }
                }
            }
        }
        for (let i = 0; i < this.buildingGrid.length; i++) {
            for (let j = 0; j < this.buildingGrid[i].length; j++) {
                if (this.buildingGrid[i][j] === CELL_AVAILABLE) {
                    this.availableCells.push([i, j])
                }
            }
        }
    }

    placeBuildings(max: number, buildingPiece1: Drawable) {
        let piece1Offsets = [];
        let piece1Heights = [];
        for (let i = 0; i < max; i++) {
            if (this.availableCells.length === 0) {
                break;
            }
            let idx = Math.floor(this.roadGen.generateRandomNumber(0, this.availableCells.length));
            let cell = this.availableCells[idx];
            this.buildingGrid[cell[0]][cell[1]] = CELL_UNAVAILABLE;
            this.availableCells.splice(idx, 1);
            let mapRadius = this.buildingGrid.length / 2;
            let buildingPos = vec2.fromValues(cell[0] - mapRadius + 0.5, cell[1] - mapRadius + 0.5);
            piece1Offsets.push(vec4.fromValues(buildingPos[0], 0, buildingPos[1], 0));
            piece1Heights.push(2);
        }

        buildingPiece1.setInstanceVBOs(piece1Offsets, piece1Heights);
        buildingPiece1.setNumInstances(piece1Heights.length);
    }
}