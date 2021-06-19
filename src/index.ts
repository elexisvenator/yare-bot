/**
 * This file is the entry point for your bot.
 */

import { PassiveBot } from './bots/passive-bot';
import { GameState } from './game-state';
import { IGameState } from './models/game-state';

//import RenderService from 'yare-code-sync/client/RenderService'
//RenderService.circle(my_spirits[0], 100);

// for logging data with recursive references
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
  for (const op of state.operations.sort((a, b) => a.priority - b.priority)) {
    const unassigned = state.unassignedMinions;
    if (unassigned.length == 0) {
      // this function is complete
      return;
    }

    if (!op.active) {
      continue;
    }

    if (op.minionDemand <= 0) {
      continue;
    }

    op.tryAssignMinionsFromSelection(state, unassigned, op.minionDemand);
  }

  // handle the leftovers
  for (const op of state.operations.sort((a, b) => a.priority - b.priority)) {
    const unassigned = state.unassignedMinions;
    if (unassigned.length == 0) {
      // this function is complete
      return;
    }

    if (!op.active) {
      continue;
    }

    if (!op.unlimitedDemand) {
      continue;
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
  for (const op of state.operations.sort((a, b) => b.priority - a.priority)) {
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

try {
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
  for (const op of state.operations) {
    op.step(state);
  }

  // 6. run minion finalize
  for (const minion of state.aliveMinions) {
    minion.runFinalSteps();
  }
} catch (error) {
  const err = error as Error;
  throw new Error(`${err.message} ${err.stack}`);
}
