import { IBot, IBotConstructor } from '../models/bot';
import { IGameState } from '../models/game-state';
import { HomeBaseHarvestOperation } from '../operations/home-base-harvest';

export const PassiveBot: IBotConstructor = class PassiveBot implements IBot {
  constructor(gameState: IGameState) {
    gameState.operations.push(new HomeBaseHarvestOperation(gameState));
  }

  step(gameState: IGameState): void {
    // do nothing;
  }
};
