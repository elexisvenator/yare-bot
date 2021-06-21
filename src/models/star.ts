import { IEntity } from './core';
import { IGameState } from './game-state';

// called GameStar to get past the 'Star' generic type
export class GameStar implements IEntity {
  public readonly energy: number;
  public readonly maxEnergy: number = 1000;
  public readonly nextCharge: number;
  public readonly position: Position;
  private _expectedSaturation = 0;
  constructor(gameState: IGameState, public readonly entity: Star, chargeDelay = 0) {
    this.energy = entity.energy;
    this.nextCharge = gameState.clock > chargeDelay ? 3 + Math.round(this.energy * 0.01) : 0;
    this.position = entity.position;
  }
  public get id(): string {
    return this.entity.id;
  }

  public get expectedSaturation(): number {
    return this._expectedSaturation;
  }

  public recommendedPassiveChargeForStar(): number {
    if (this.energy >= 1000) {
      return 0;
    }

    if (this.energy <= 0) {
      return 4;
    }

    return Math.ceil((1000 - this.energy) / 250);
  }

  public isFullySaturated(): boolean {
    return this.nextCharge - this._expectedSaturation - this.recommendedPassiveChargeForStar() <= 0;
  }

  public saturate(amount: number): void {
    this._expectedSaturation += amount;
  }

  public trySaturate(amount: number): boolean {
    // if current saturation + amount would oversaturate the star
    if (this.nextCharge - (this._expectedSaturation + amount) - this.recommendedPassiveChargeForStar() < 0) {
      return false;
    }

    this._expectedSaturation += amount;
    return true;
  }
}
