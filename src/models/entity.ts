import { IPositionable } from './positionable';

export interface IEntity extends IPositionable {
  readonly id: string;
}
