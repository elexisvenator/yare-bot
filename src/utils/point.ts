import { IPositionable } from '../models/positionable';
export type distance = number;
export type degrees = number;
export type radians = number;
export type vector = { readonly distance: distance; readonly direction: degrees };
export type point = Position;

export default abstract class Point {
  private static degToRad(degrees: degrees): radians {
    return degrees * (Math.PI / 180);
  }
  private static radToDeg(radians: radians): degrees {
    return radians / (Math.PI / 180);
  }

  static getDistance(p1: IPositionable, p2: IPositionable): distance {
    const a = p1.position[0] - p2.position[0];
    const b = p1.position[1] - p2.position[1];
    return Math.sqrt(a * a + b * b);
  }

  static getDirection(p1: IPositionable, p2: IPositionable): degrees {
    return this.radToDeg(Math.atan2(p2.position[0] - p1.position[0], p2.position[1] - p1.position[1]));
  }

  static getVector(p1: IPositionable, p2: IPositionable): vector {
    return {
      distance: this.getDistance(p1, p2),
      direction: this.getDirection(p1, p2),
    };
  }

  static changeDirection(v: vector, offset: degrees): vector {
    return {
      distance: v.distance,
      direction: v.direction + offset,
    };
  }

  static setDirection(v: vector, newDirection: degrees): vector {
    return {
      distance: v.distance,
      direction: newDirection,
    };
  }

  static reverse(v: vector): vector {
    return {
      distance: v.distance,
      direction: v.direction + 180,
    };
  }

  static changeDistance(v: vector, offset: number): vector {
    const newDistance = v.distance + offset;
    return {
      distance: Math.abs(newDistance),
      direction: newDistance < 0 ? v.direction + 180 : v.direction,
    };
  }

  static setDistance(v: vector, newDistance: distance): vector {
    return {
      distance: Math.abs(newDistance),
      direction: newDistance < 0 ? v.direction + 180 : v.direction,
    };
  }

  static getPointFromPositionAtVector(p: IPositionable, v: vector): point {
    const vectorPosition = Point.vectorToPoint(v);
    return [p.position[0] + vectorPosition[0], p.position[1] + vectorPosition[1]];
  }

  static vectorToPoint(v: vector): point {
    return [v.distance * Math.cos(this.degToRad(v.direction)), v.distance * Math.sin(this.degToRad(v.direction))];
  }
}
