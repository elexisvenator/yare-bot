import { IGameState } from './game-state';
import { IPositionable } from './positionable';

// called GameStar to get past the 'Star' generic type
export class GameStar implements IPositionable {
  public readonly energy: number;
  public readonly maxEnergy: number = 1000;
  public readonly nextCharge: number;
  public readonly position: Position;
  private _expectedSaturation = 0;
  constructor(gameState: IGameState, private readonly star: Star, chargeDelay = 0) {
    this.energy = star.energy;
    this.nextCharge = gameState.clock > chargeDelay ? 3 + Math.round(this.energy * 0.01) : 0;
    this.position = star.position;
  }

  public get expectedSaturation(): number {
    return this._expectedSaturation;
  }

  public isFullySaturated(): boolean {
    return this.nextCharge - this._expectedSaturation - (this.energy == 1000 ? 0 : 1) <= 0;
  }

  public saturate(amount: number): void {
    this._expectedSaturation += amount;
  }

  public trySaturate(amount: number): boolean {
    // if current saturation + amount would oversaturate the star
    if (this.nextCharge - (this._expectedSaturation + amount) - (this.energy == 1000 ? 0 : 1) < 0) {
      return false;
    }

    this._expectedSaturation += amount;
    return true;
  }
}
