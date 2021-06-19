import { IBot, IBotConstructor } from '../models/bot';
import { IGameState } from '../models/game-state';
import { HomeBaseHarvestOperation } from '../operations/home-base-harvest';

export const PassiveBot: IBotConstructor = class PassiveBot implements IBot {
  constructor(gameState: IGameState) {
    gameState.operations.push(new HomeBaseHarvestOperation(gameState));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  step(gameState: IGameState): void {
    // do nothing;
  }
};
