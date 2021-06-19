import { IGameState } from './game-state';

export interface IBotConstructor {
  // Initialise the bot, only called once per game.
  // Use ths to run any inital tasks, such as long-running operations.
  new (gameState: IGameState): IBot;
}

export interface IBot {
  step(gameState: IGameState): void;
}
