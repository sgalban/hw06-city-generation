import {vec2, vec3, vec4} from 'gl-matrix';

export function fract(x: number) : number {
    return x - Math.floor(x);
}

export function between(val: number, min: number, max: number): boolean {
    if (max < min) {
        [min, max] = [max, min];
    }
    return val > min && val < max;
}

export function normal(val: number): boolean {
    return val >= 0 && val <= 1;
}

export function lerp(start: vec2 | number[], end: vec2 | number[], t: number): vec2 {
    let [x1, y1] = [start[0], start[1]];
    let [x2, y2] = [end[0], end[1]];
    return vec2.fromValues((t - 1) * x1 + t * x2, (t - 1) * y1 + t * y2);
}

export function unlerp(start: number, end: number, value: number): number {
    return (value - start) / (end - start);
}

export function getIntersection(
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
    else if (
        between(x, start1[0], end1[0]) && between(x, start2[0], end2[0]) && 
        (start1[1] === end1[1] || start2[1] === end2[1])
    ) {
        return vec2.fromValues(x, y);
    }
    else {
        return null;
    }

}