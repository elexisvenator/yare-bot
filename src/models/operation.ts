import { IGameState } from './game-state';
import { Minion } from './minion';

export type OperationStatus = 'inactive' | 'active' | 'complete';

export interface IOperationBase {
  /**
   * A list of minion ids assigned to this operation (but not child operations)
   * @type {string[]}
   * @memberof IOperationBase
   */
  readonly assignedMinions: string[];

  /**
   * A list of sub-operations under this operation
   * @type {ISubOperation[]}
   * @memberof IOperationBase
   */
  readonly subOperations: ISubOperation[];

  /**
   * Perform the next step for this operation.
   * Should recursively call `operationStep()` on all sub operations.
   * @param gameState The game's current state.
   * @returns The operation's status post-step. Either active, inactive - meaning not utilising any minions, or complete - which means this operation can be removed.
   * @memberof IOperation
   */
  step: (gameState: IGameState) => OperationStatus;

  /**
   * Return all minion ids assigned to this operation and child operations.
   * @returns {string[]} List of minion ids.
   * @memberof IOperationBase
   */
  listAllAssignedMinions: () => string[];

  /**
   * Force-unassign this minion from this operation
   * @param {IGameState} gameState The game's current state.
   * @param {Minion} minion The mininon being unassigned
   * @memberof IOperation
   */
  poachMinion: (gameState: IGameState, minion: Minion) => void;

  /**
   * Notifies that a minion assigned to this operation is dead.
   * This notification happens before step() at the stat of every tick, for each minion.
   * The operation should unassign the minion if it doesn't care about it anymore.
   * @param {IGameState} gameState The game's current state.
   * @param {Minion} minion The deceased minion.
   * @memberof IOperationBase
   */
  handleDeadMinion: (gameState: IGameState, minion: Minion) => void;
}

export interface IOperation extends IOperationBase {
  /**
   * Returns whether an operation is active or not.
   * An inactive operation will not have their demand satisified.
   * If there is a need to take minions then taking from this operation will be prioritised over another operation of equal priority.
   * @type {boolean}
   * @memberof IOperation
   */
  readonly active: boolean;

  /**
   * How important this operation is.
   * Higher numbered operations have their minion demand satisfied earlier and are less likely to have their minions removed.
   * @type {number}
   * @memberof IOperation
   */
  readonly priority: number;

  /**
   * How many minions are currently in demand.
   * If a positive number then the operation wants this many more minions to be optimal.
   * If 0 then the operation has as many as it needs.
   * If negative then this operation has that many minions it can afford to lose while still being optimal.
   * These will only be taken if there is a demand elsewhere.
   * @type {number}
   * @memberof IOperation
   */
  readonly minionDemand: number;

  /**
   * Indicates that this operation can make use of an unlimited number of additional workers.
   * Workers are only placed here if there is no specific demand anywhere else and the workers are either
   * unassigned or are surplus to a lower-priority operation.
   * @type {boolean}
   * @memberof IOperation
   */
  readonly unlimitedDemand: boolean;

  /**
   * Request that the operation be halted and all minions unassigned.
   * Operation should make best effort to do this but may reject if not possible.
   * Operation should make best effort to free all minions.
   * @param gameState The game's current state.
   * @returns {Minion[]} The list of minions that are now unassigned.
   * @memberof IOperation
   */
  suspendOperation: (gameState: IGameState) => Minion[];

  /**
   * Operation can pick from a selection of minons to assign to itself.
   * @param {IGameState} gameState The game's current state.
   * @param {Minion[]} minions The available minions to pick from
   * @param {number} max The maximum number of minions from the available pool that can be picked.
   * @returns {Minion[]} The accepted minions, if any.
   * @memberof IOperation
   */
  tryAssignMinionsFromSelection: (gameState: IGameState, minions: Minion[], max: number) => Minion[];

  /**
   * Request that the operation release a minion.
   * @param gameState The game's current state.
   * @returns {Minion | null} The mininon being released, or none if no minion could be released.
   * @memberof IOperation
   */
  tryUnassignMinion: (gameState: IGameState) => Minion | null;
}

export interface ISubOperation extends IOperationBase {
  /**
   * The parent operation for this sub operation.
   * @type {IOperation}
   * @memberof ISubOperation
   */
  readonly parentOperation: IOperation;
}

export abstract class OperationBase implements IOperationBase {
  abstract readonly subOperations: ISubOperation[];
  private readonly _assignedMinions: string[] = [];

  public get assignedMinions(): string[] {
    return [...this._assignedMinions];
  }

  public listAllAssignedMinions(): string[] {
    return this.subOperations.reduce((agg, sub) => agg.concat(sub.listAllAssignedMinions()), [...this.assignedMinions]);
  }

  /**
   * Assign the minion to this operation. Will do nothing if the minion is already assigned.
   * @protected
   * @param {Minion[]} minions The minion to assign
   * @memberof OperationBase
   */
  protected assignMinion(gameState: IGameState, ...minions: Minion[]): void {
    for (const minion of minions) {
      if (minion.operation != this) {
        minion.unassign(gameState);
      }

      const index = this._assignedMinions.indexOf(minion.id);
      if (index >= 0) continue;

      console.log(`Assigning minion ${minion.id} to operation ${this.constructor.name}`);
      this._assignedMinions.push(minion.id);
      minion.assign(gameState, this);
    }
  }

  /**
   * Unassign the minion from this operation.
   * @protected
   * @param {Minion} minion The minion to unassign
   * @returns {boolean} `true` if the minion is removed, `false` if the minion was not currently assigned.
   * @memberof OperationBase
   */
  protected unassignMinion(minion: Minion): boolean {
    const index = this._assignedMinions.indexOf(minion.id);
    if (index < 0) return false;
    this._assignedMinions.splice(index, 1);
    return true;
  }

  poachMinion(gameState: IGameState, minion: Minion): void {
    this.unassignMinion(minion);
  }

  public abstract step(gameState: IGameState): OperationStatus;
  public abstract handleDeadMinion(gameState: IGameState, minion: Minion): void;
}
