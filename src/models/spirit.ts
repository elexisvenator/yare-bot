import { IEntity } from './entity';
import { IPositionable } from './positionable';

export interface ISpirit extends IEntity, IPositionable {
  readonly spirit: _Spirit;
  readonly id: string;
}
