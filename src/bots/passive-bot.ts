import { IBot, IBotConstructor } from '../models/bot';
import { IGameState } from '../models/game-state';
import { SelfDefenceOperation } from '../operations/self-defence';
import { StarHarvestOperation } from '../operations/star-harvest';

export const PassiveBot: IBotConstructor = class PassiveBot implements IBot {
  private readonly selfDefenceOperation: SelfDefenceOperation;
  constructor(gameState: IGameState) {
    this.selfDefenceOperation = new SelfDefenceOperation(100);
    gameState.operations.push(new StarHarvestOperation(gameState, 10, gameState.homeStar), this.selfDefenceOperation);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  step(gameState: IGameState): void {
    if (gameState.clock == 100) {
      gameState.operations.push(new StarHarvestOperation(gameState, 5, gameState.neutralStar));
    }

    for (const minion of gameState.aliveMinions.filter((m) => this.selfDefenceOperation.shouldTransfer(gameState, m))) {
      this.selfDefenceOperation.transfer(gameState, minion);
    }
  }
};
