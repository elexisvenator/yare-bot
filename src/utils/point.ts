import { firstBy } from 'thenby';
import { IPositionable } from '../models/positionable';
import { NonEmptyArray } from './types';

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

  static getDistance(p1: point, p2: point): distance {
    const a = p1[0] - p2[0];
    const b = p1[1] - p2[1];
    return Math.sqrt(a * a + b * b);
  }

  static getDirection(p1: point, p2: point): degrees {
    return this.radToDeg(Math.atan2(p2[0] - p1[0], p2[1] - p1[1]));
  }

  static getVector(p1: point, p2: point): vector {
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

  static getPointFromPointAtVector(p: point, v: vector): point {
    const vectorPosition = Point.vectorToPoint(v);
    return [p[0] + vectorPosition[0], p[1] + vectorPosition[1]];
  }

  static vectorToPoint(v: vector): point {
    return [v.distance * Math.sin(this.degToRad(v.direction)), v.distance * Math.cos(this.degToRad(v.direction))];
  }

  static sortByDistanceTo<T extends IPositionable>(positions: T[], p: point, sortOrder: SortOrder = 'asc'): T[] {
    if (positions.length <= 1) {
      return [...positions];
    }

    return positions.sort(firstBy((po) => this.getDistance(p, po.position), sortOrder));
  }

  static getNearestPosition<T extends IPositionable>(p: point, ...positions: NonEmptyArray<T>): T {
    if (positions.length == 1) {
      return positions[0];
    }

    return this.sortByDistanceTo(positions, p, 'asc')[0];
  }
}
