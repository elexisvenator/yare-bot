/**
 * This file is the entry point for your bot.
 */

import { firstBy } from 'thenby';
import { PassiveBot } from './bots/passive-bot';
import { IGameState, GameState } from './models/game-state';
import { IOperation } from './models/operation';
import { Logging } from './utils/logging';

//import RenderService from 'yare-code-sync/client/RenderService'
//RenderService.circle(my_spirits[0], 100);

// for logging data with recursive references
// eslint-disable-next-line  @typescript-eslint/no-unused-vars
function safeStringify(obj: unknown, indent = 2): string {
  const cache: unknown[] = [];
  const retVal = JSON.stringify(
    obj,
    (key, value) =>
      typeof value === 'object' && value !== null
        ? cache.includes(value)
          ? '##duplicateRef' // Duplicate reference found, discard key
          : cache.push(value) && value // Store value in our collection
        : value,
    indent
  );
  return retVal;
}

function assignAllUnassignedMinions(state: IGameState) {
  // order by highest priority
  for (const op of state.operations
    .filter((op) => op.active && op.minionDemand > 0)
    .sort(firstBy((op) => op.priority, 'desc'))) {
    const unassigned = state.unassignedMinions;
    if (unassigned.length == 0) {
      // this function is complete
      return;
    }

    op.tryAssignMinionsFromSelection(state, unassigned, op.minionDemand);
  }

  // handle the leftovers
  for (const op of state.operations
    .filter((op) => op.active && op.unlimitedDemand)
    .sort(firstBy((op: IOperation) => op.minionDemand < 0).thenBy((op) => op.priority, 'desc'))) {
    const unassigned = state.unassignedMinions;
    if (unassigned.length == 0) {
      // this function is complete
      return;
    }

    op.tryAssignMinionsFromSelection(state, unassigned, unassigned.length);
  }
}

function reassignSurplusMinions(state: IGameState) {
  const { surplus, demand } = state.operations.reduce(
    (agg, op) => {
      agg.surplus += op.minionDemand >= 0 ? 0 : 0 - op.minionDemand;
      agg.demand += op.minionDemand <= 0 ? 0 : op.minionDemand;
      return agg;
    },
    { surplus: state.unassignedMinions.length, demand: 0 }
  );

  if (demand == 0 || surplus == 0) {
    // can't move anything around
    return;
  }

  const supplyToTake = Math.min(demand, surplus);
  // unassign as many as needed
  // lowest to highest priority
  for (const op of state.operations.sort(firstBy((op) => op.priority, 'desc'))) {
    while (op.minionDemand < 0 && state.unassignedMinions.length < supplyToTake) {
      const taken = op.tryUnassignMinion(state);
      if (taken == null) {
        // operation refused to unassign a minion
        break;
      }
    }
  }

  // now assign them where needed
  assignAllUnassignedMinions(state);
}

// gamestate converts the game data into a more workable dataset
const state = new GameState(PassiveBot);

// 1. handle all dead minions
for (const deadMinion of state.deadMinions) {
  if (deadMinion.operation == null) {
    continue;
  }
  deadMinion.operation.handleDeadMinion(state, deadMinion);
}

// 2. run bot step
state.bot.step(state);

// 3. assign all unassigned minions
assignAllUnassignedMinions(state);

// 4. reassign surplus minions
reassignSurplusMinions(state);

// 5. run all operation steps
for (const op of state.operations.sort(firstBy((op: IOperation) => op.active).thenBy((op) => op.priority, 'desc'))) {
  op.step(state);
}

// 6. run minion finalize
for (const minion of state.aliveMinions) {
  minion.runFinalSteps(state);
}

console.log(`Clock: ${state.clock}`);
Logging.logOperations(state);
