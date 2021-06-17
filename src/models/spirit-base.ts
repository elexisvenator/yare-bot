import { ISpirit } from './spirit';

export abstract class SpiritBase implements ISpirit {
  constructor(public readonly spirit: Spirit) {}

  public get id(): string {
    return this.spirit.id;
  }

  public get canSplit(): boolean {
    return this.spirit.shape == 'circles';
  }

  public get canJump(): boolean {
    return this.spirit.shape == 'squares';
  }

  public get position(): Position {
    return this.spirit.position;
  }
}
