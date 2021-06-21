import Point, { degrees, point } from '../utils/point';
import { IFriendly, IHostile } from './core';
import { IGameState } from './game-state';
import { IMinionMemory } from './memory';
import { IOperationBase } from './operation';
import { IPositionable } from './positionable';
import { SpiritBase } from './spirit-base';
import { GameStar } from './star';

export class Minion extends SpiritBase implements IFriendly {
  private isEnergizingSomething = false;
  public readonly memory: IMinionMemory;
  public isFriendly: true = true;

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

  public moveDirection(direction: degrees): void {
    // move as far as possible in direction
    this.moveToPoint(
      Point.getPointFromPointAtVector(this.position, { direction: direction, distance: SPIRIT_SPEED * 2 })
    );
  }

  public moveToPoint(p: point): void {
    this.entity.move(p);
  }

  public charge(friendly: IFriendly): boolean {
    if (Point.getDistance(this.position, friendly.position) <= ENERGIZE_RANGE - 1) {
      this.isEnergizingSomething = true;
      this.entity.energize(friendly.entity);
      return true;
    }
    return false;
  }

  public attack(target: IHostile): boolean {
    if (Point.getDistance(this.position, target.position) <= ENERGIZE_RANGE - 1) {
      this.isEnergizingSomething = true;
      // TODO: don't energize target if too much damage is already being dealt
      this.entity.energize(target.entity);
      return true;
    }
    return false;
  }

  public getNearestStar(gameState: IGameState): GameStar {
    return Point.getNearestPosition(this.position, gameState.homeStar, gameState.neutralStar, gameState.hostileStar);
  }

  public harvest(gameState: IGameState, allowOversaturation: boolean): boolean {
    if (this.entity.energy >= this.entity.energy_capacity) {
      return false;
    }

    const nearestStar = this.getNearestStar(gameState);
    if (allowOversaturation) {
      nearestStar.saturate(this.entity.size);
      this.isEnergizingSomething = true;
      this.entity.energize(this.entity);
      return true;
    }

    if (nearestStar.trySaturate(this.entity.size)) {
      this.isEnergizingSomething = true;
      this.entity.energize(this.entity);
      return true;
    }

    return false;
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

  public nearestEnemy(gameState: IGameState): IHostile {
    if (gameState.outpost.isFriendly) {
      return Point.getNearestPosition(this.position, gameState.hostileBase as IHostile, ...gameState.hostiles);
    }

    return Point.getNearestPosition(
      this.position,
      gameState.hostileBase as IHostile,
      gameState.outpost as IHostile,
      ...gameState.hostiles
    );
  }

  public kite(p: IPositionable): void {
    const pVector = Point.getVector(p.position, this.position);
    const kitePoint = Point.getPointFromPointAtVector(p.position, Point.setDistance(pVector, ENERGIZE_RANGE - 1));
    this.moveToPoint(kitePoint);
  }
}
