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

    quad: Drawable;
    pent: Drawable;
    hex: Drawable;
    oct: Drawable;

    quadOffsets: vec4[];
    quadHeights: number[];
    quadSize: number[];
    pentOffsets: vec4[];
    pentHeights: number[];
    pentSize: number[];
    hexOffsets: vec4[];
    hexHeights: number[];
    hexSize: number[];
    octOffsets: vec4[];
    octHeights: number[];
    octSize: number[];
    
    constructor(_roadGen: RoadGenerator, _geoData: GeoData, mapRadius: number, 
                _quad: Drawable, _pent: Drawable, _hex: Drawable, _oct: Drawable) {

        this.quad = _quad;
        this.pent = _pent;
        this.hex = _hex;
        this.oct = _oct;

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

    createBuilding(pos: vec2) {
        let populationDensity: number = this.geoData.getPopulationDensity(pos);
        if (populationDensity > 0.7 && this.roadGen.generateRandomNumber() < 0.5) {
            this.quadHeights.push(0.75, 3, 6, 6.2, 6.4, 8)
            this.quadOffsets.push(
                vec4.fromValues(pos[0], 0, pos[1], 0),
                vec4.fromValues(pos[0], 0, pos[1], 0),
                vec4.fromValues(pos[0], 0, pos[1], 0),
                vec4.fromValues(pos[0], 0, pos[1], 0),
                vec4.fromValues(pos[0], 0, pos[1], 0),
                vec4.fromValues(pos[0], 0, pos[1], 0)
            );
            this.quadSize.push(1.5, 1.2, 1.1, 1, 0.9, 0.2);
            return;
        }
        let numLayers = Math.floor(this.roadGen.generateRandomNumber(1, 0.5 + populationDensity * 4.0))
        let heights = new Array(numLayers).fill(0);
        let offsets = new Array(numLayers).fill(0);
        for (let i = 0; i < numLayers; i++) {
            heights[i] = this.roadGen.generateRandomNumber(1, 1 + populationDensity * 4);
            if (i > 0) {
                heights[i] = heights[i] + heights [i - 1];
            }
        }
        let baseSize = this.roadGen.generateRandomNumber(0.8, 1.4);
        if (populationDensity > 0.7) {
            baseSize = 1.5;
        }
        for (let i = 0; i < numLayers; i++) {
            let size = baseSize * Math.pow(0.8, i);
            let idx = Math.floor(this.roadGen.generateRandomNumber(0, 4));
            if (numLayers == 1) {
                idx = 0;
            }
            let offset: vec2 = vec2.fromValues(
                this.roadGen.generateRandomNumber(-(1.5 - size), (1.5 - size)),
                this.roadGen.generateRandomNumber(-(1.5 - size), (1.5 - size))
            );
            let totalPos: vec4 = vec4.fromValues(pos[0] + offset[0], 0, pos[1] + offset[1], 0);
            if (idx === 0) {
                this.quadOffsets.push(totalPos);
                this.quadHeights.push(heights[i]);
                this.quadSize.push(size);
            }
            else if (idx === 1) {
                this.pentOffsets.push(totalPos);
                this.pentHeights.push(heights[i]);
                this.pentSize.push(size);
            }
            else if (idx === 2) {
                this.hexOffsets.push(totalPos);
                this.hexHeights.push(heights[i]);
                this.hexSize.push(size);
            }
            else if (idx === 3) {
                this.octOffsets.push(totalPos);
                this.octHeights.push(heights[i]);
                this.octSize.push(size);
            }
        }

    }

    placeBuildings(max: number) {
        this.quadOffsets = [];
        this.quadHeights = [];
        this.quadSize = [];
        this.pentOffsets = [];
        this.pentHeights = [];
        this.pentSize = [];
        this.hexOffsets = [];
        this.hexHeights = [];
        this.hexSize = [];
        this.octOffsets = [];
        this.octHeights = [];
        this.octSize = [];

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
            this.createBuilding(buildingPos);
            this.quadOffsets.push(vec4.fromValues(buildingPos[0], 0, buildingPos[1], 0));
            this.quadHeights.push(2);
            this.quadSize.push(0.5);
        }

        this.quad.setBuildingVBOs(this.quadOffsets, this.quadHeights, this.quadSize);
        this.quad.setNumInstances(this.quadHeights.length);
        this.pent.setBuildingVBOs(this.pentOffsets, this.pentHeights, this.pentSize);
        this.pent.setNumInstances(this.pentHeights.length);
        this.hex.setBuildingVBOs(this.hexOffsets, this.hexHeights, this.hexSize);
        this.hex.setNumInstances(this.hexHeights.length);
        this.oct.setBuildingVBOs(this.octOffsets, this.octHeights, this.octSize);
        this.oct.setNumInstances(this.octHeights.length);
    }
}