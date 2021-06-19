import { IHostile } from './core';
import { SpiritBase } from './spirit-base';

export class Hostile extends SpiritBase implements IHostile {
  public friendly: false = false;
  constructor(spirit: Spirit) {
    super(spirit);
  }
}
