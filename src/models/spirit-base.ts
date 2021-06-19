import { ISpirit } from './core';

export abstract class SpiritBase implements ISpirit {
  constructor(public readonly entity: Spirit) {}

  public get id(): string {
    return this.entity.id;
  }

  public get alive(): boolean {
    return this.entity.hp == 1;
  }

  public get position(): Position {
    return this.entity.position;
  }

  public get shape(): 'circles' | 'squares' | 'triangles' {
    return this.entity.shape;
  }

  public get canSplit(): boolean {
    return this.shape == 'circles';
  }

  public get canJump(): boolean {
    return this.shape == 'squares';
  }
}
