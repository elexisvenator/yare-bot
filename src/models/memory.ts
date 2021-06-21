import { IBot } from './bot';
import { IOperation, IOperationBase } from './operation';

export interface IMinionMemory {
  allocatedTo: IOperationBase | null;
  selfDefence?: {
    initialPosition: Position;
  };
}

export type GameMemory = {
  minions: { [id: string]: IMinionMemory };
  operations: IOperation[];
  bot: IBot;
  clock: number;
};
