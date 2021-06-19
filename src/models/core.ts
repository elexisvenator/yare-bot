import { IPositionable } from './positionable';

export interface IEntity extends IPositionable {
  readonly id: string;
  readonly entity: Entity;
}

export interface IEnergizable extends IEntity {
  readonly entity: Energizable;
}

export interface IShape {
  readonly shape: 'circles' | 'squares' | 'triangles';
}

export interface ISpirit extends IEntity, IPositionable, IShape {
  readonly entity: _Spirit;
  readonly alive: boolean;
}

export interface IFactioned extends IEnergizable {
  readonly friendly: boolean;
}

export interface IFriendly extends IFactioned {
  readonly friendly: true;
}

export interface IHostile extends IFactioned {
  readonly friendly: false;
}
