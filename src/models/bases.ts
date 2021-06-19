import { IFactioned, IFriendly, IHostile, IShape } from './core';
import { IGameState } from './game-state';

export class FriendlyBase implements IFriendly, IShape {
  public friendly: true = true;
  constructor(public readonly entity: Base) {}

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

  public getNewSpiritCost(gameState: IGameState): number {
    switch (this.shape) {
      case 'circles': {
        const circleCount = gameState.aliveMinions.length;
        return circleCount >= 300 ? 400 : circleCount >= 200 ? 200 : circleCount >= 100 ? 100 : 50;
      }
      case 'squares': {
        const squareCount = gameState.aliveMinions.length;
        return squareCount >= 10 ? 800 : 500;
      }
      case 'triangles':
        return 200;

      default:
        throw new Error(`Unknown shape for base: '${this.shape}'`);
    }
  }
}

export class HostileBase implements IHostile, IShape {
  public friendly: false = false;
  constructor(public readonly entity: Base) {}

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
}

export class NeutralOutpost implements IFactioned {
  /**
   *
   */
  constructor(public readonly entity: Outpost) {}

  public get id(): string {
    return this.entity.id;
  }

  public get friendly(): boolean {
    return this.entity.control == this_player_id;
  }

  public get position(): Position {
    return this.entity.position;
  }
}
