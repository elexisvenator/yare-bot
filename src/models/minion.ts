import Point, { point } from '../utils/point';
import { IFriendly } from './core';
import { IGameState } from './game-state';
import { IMinionMemory } from './memory';
import { IOperationBase } from './operation';
import { IPositionable } from './positionable';
import { SpiritBase } from './spirit-base';

export class Minion extends SpiritBase implements IFriendly {
  private isEnergizingSomething = false;
  private readonly memory: IMinionMemory;
  public friendly: true = true;

  constructor(spirit: Spirit, mem: IMinionMemory) {
    super(spirit);
    this.memory = mem;
  }

  public shout(message: string): void {
    this.entity.shout(message);
  }

  public moveTowards(p: IPositionable): void {
    this.moveToPoint(p.position);
  }

  public moveToPoint(p: point): void {
    this.entity.move(p);
  }

  public charge(friendly: IFriendly): boolean {
    if (Point.getDistance(this.position, friendly.position) <= ENERGIZE_RANGE) {
      this.isEnergizingSomething = true;
      this.entity.energize(friendly.entity);
      return true;
    }
    return false;
  }

  public harvest(gameState: IGameState, allowOversaturation: boolean): void {
    if (this.entity.energy >= this.entity.energy_capacity) {
      return;
    }

    const nearestStar = Point.getNearestPosition(
      this.position,
      gameState.homeStar,
      gameState.neutralStar,
      gameState.hostileStar
    );

    if (allowOversaturation) {
      nearestStar.saturate(this.entity.size);
      this.isEnergizingSomething = true;
      this.entity.energize(this.entity);
      return;
    }

    if (nearestStar.trySaturate(this.entity.size)) {
      this.isEnergizingSomething = true;
      this.entity.energize(this.entity);
    }
  }

  public runFinalSteps(gameState: IGameState): void {
    if (!this.isEnergizingSomething) {
      // passive recharge (if possible)
      this.harvest(gameState, false);
    }
  }

  public get operation(): IOperationBase | null {
    return this.memory.allocatedTo;
  }

  public unassign(gameState: IGameState): void {
    if (this.operation != null) {
      this.operation.poachMinion(gameState, this);
    }
    this.memory.allocatedTo = null;
  }

  public assign(gameState: IGameState, operation: IOperationBase): void {
    if (this.operation == operation) {
      return;
    }
    if (this.operation != null) {
      this.unassign(gameState);
    }
    this.memory.allocatedTo = operation;
  }
}
