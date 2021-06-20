import { IBot } from './bot';
import { IOperation, IOperationBase } from './operation';

export interface IMinionMemory {
  allocatedTo: IOperationBase | null;
  lastCharge: string | null;
}

export type GameMemory = {
  minions: { [id: string]: IMinionMemory };
  operations: IOperation[];
  bot: IBot;
  clock: number;
};
