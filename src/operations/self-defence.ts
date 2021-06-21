import { firstBy } from 'thenby';
import { IGameState } from '../models/game-state';
import { Minion } from '../models/minion';
import { IOperation, ISubOperation, OperationBase, OperationStatus } from '../models/operation';
import Point from '../utils/point';

// The range that minions go into self-defence mode.
const engageRange = UNDER_THREAT_RANGE;
// If attacking, stop attacking if the nearest enemy is this far away.
const disengageRange = UNDER_THREAT_RANGE * 1.2;
// if fleeing, consider youself safe if the nearest enemy is this far away
const safeRange = UNDER_THREAT_RANGE * 1.1;
const pathDeviationLimit = ENERGIZE_RANGE * 1.5;

export class SelfDefenceOperation extends OperationBase implements IOperation {
  public readonly name: string;
  // the harvest is always active
  public readonly active: boolean = true;
  public readonly unlimitedDemand: boolean = false;
  public readonly minionDemand = 0;
  public readonly attackOperation: AttackSubOperation;
  public readonly fleeOperation: FleeSubOperation;

  constructor(public readonly priority: number) {
    super();
    this.name = `Self defence`;
    this.attackOperation = new AttackSubOperation(this);
    this.fleeOperation = new FleeSubOperation(this);
  }

  public get subOperations(): ISubOperation[] {
    return [this.attackOperation, this.fleeOperation];
  }

  public step(): OperationStatus {
    return 'active';
  }

  public suspendOperation(): Minion[] {
    // suspending self-defence is sort of suicide, so dont allow it.
    throw new Error('Suspending self-defence is not allowed.');
    return [];
  }

  public tryAssignMinionsFromSelection(gameState: IGameState, minions: Minion[], max: number): Minion[] {
    // Should never be called as this operation never has a positive demand
    throw new Error('Method not implemented.');

    const minionsToTake = minions.slice(0, max);
    this.assignMinion(gameState, ...minionsToTake);
    return minionsToTake;
  }

  public tryUnassignMinion(gameState: IGameState): Minion | null {
    // find the minion under the least threat to unassign
    if (this.assignedMinions.length == 0) {
      return null;
    }
    if (this.assignedMinions.length == 1) {
      return gameState.getMinion(this.assignedMinions[0]);
    }

    const leastThreatened = this.assignedMinions
      .map((id) => gameState.getMinion(id))
      .sort(firstBy((m) => m.nearestEnemy(gameState), 'desc'))
      .find(() => true);

    // no minions to unassign
    return leastThreatened || null;
  }

  public shouldTransfer(gameState: IGameState, minion: Minion): boolean {
    if (
      minion.operation == this ||
      minion.operation == this.fleeOperation ||
      minion.operation == this.attackOperation
    ) {
      // already here, don't need to transfer
      return false;
    }
    const enemyDistance = Point.getDistance(minion.position, minion.nearestEnemy(gameState).position);
    return enemyDistance <= engageRange;
  }

  public transfer(gameState: IGameState, minion: Minion): void {
    const action = this.bestActionForMinion(
      gameState,
      minion,
      minion.entity.energy / minion.entity.energy_capacity < MIN_ATTACK_ENERGY ? 'flee' : 'attack'
    );

    if (action == 'safe') {
      minion.unassign(gameState);
      return;
    }

    minion.memory.selfDefence = { initialPosition: [...minion.position] };

    if (action == 'attack') {
      this.attackOperation.transfer(gameState, minion);
      return;
    }

    if (action == 'flee') {
      this.fleeOperation.transfer(gameState, minion);
      return;
    }

    throw new Error('Unreachable code');
  }

  public bestActionForMinion(
    gameState: IGameState,
    minion: Minion,
    currentAction: 'attack' | 'flee'
  ): 'attack' | 'flee' | 'safe' {
    const enemyDistance = Point.getDistance(minion.position, minion.nearestEnemy(gameState).position);

    if (currentAction == 'attack') {
      if (enemyDistance > disengageRange) {
        return 'safe';
      }

      if (
        Point.getDistance(minion.position, minion.memory.selfDefence?.initialPosition ?? minion.position) >
        pathDeviationLimit
      ) {
        return 'flee';
      }
    } else if (currentAction == 'flee') {
      if (enemyDistance > safeRange) {
        return 'safe';
      }
    }

    if (minion.entity.energy / minion.entity.energy_capacity < MIN_ATTACK_ENERGY) {
      return 'flee';
    }

    return 'attack';
  }
}

class AttackSubOperation extends OperationBase implements ISubOperation {
  public readonly subOperations: ISubOperation[] = [];

  constructor(public readonly parentOperation: SelfDefenceOperation) {
    super();
  }
  public step(gameState: IGameState): OperationStatus {
    for (const minion of this.assignedMinions.map((id) => gameState.getMinion(id))) {
      const bestAction = this.parentOperation.bestActionForMinion(gameState, minion, 'attack');
      console.log(`${minion.id} ${bestAction}`);
      if (bestAction == 'safe') {
        minion.unassign(gameState);
        continue;
      }

      if (bestAction == 'flee') {
        this.parentOperation.fleeOperation.transfer(gameState, minion);
        continue;
      }

      this.minionStep(gameState, minion);
    }

    return 'active';
  }

  public transfer(gameState: IGameState, minion: Minion): void {
    this.assignMinion(gameState, minion);
    minion.shout('attack');
  }

  private minionStep(gameState: IGameState, minion: Minion): void {
    const nearestEnemy = minion.nearestEnemy(gameState);
    console.log(nearestEnemy.id);
    minion.kite(nearestEnemy);
    // TODO: Target someone else if attacking fails
    // TODO: Consider assisting another minion in distress
    minion.attack(nearestEnemy);
  }
}

class FleeSubOperation extends OperationBase implements ISubOperation {
  public readonly subOperations: ISubOperation[] = [];

  constructor(public readonly parentOperation: SelfDefenceOperation) {
    super();
  }

  public step(gameState: IGameState): OperationStatus {
    for (const minion of this.assignedMinions.map((id) => gameState.getMinion(id))) {
      const bestAction = this.parentOperation.bestActionForMinion(gameState, minion, 'flee');
      if (bestAction == 'safe') {
        minion.unassign(gameState);
        continue;
      }

      if (bestAction == 'attack') {
        this.parentOperation.attackOperation.transfer(gameState, minion);
        continue;
      }

      this.minionStep(gameState, minion);
    }

    return 'active';
  }

  public transfer(gameState: IGameState, minion: Minion): void {
    this.assignMinion(gameState, minion);
    minion.shout('flee');
  }

  private minionStep(gameState: IGameState, minion: Minion): void {
    const nearestEnemy = minion.nearestEnemy(gameState);
    minion.moveDirection(Point.getDirection(nearestEnemy.position, minion.position));
  }
}
