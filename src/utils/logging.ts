import { IGameState } from '../models/game-state';

export abstract class Logging {
  public static logOperations(gameState: IGameState): void {
    //          8       3 20                   3 6      3 7       3 6
    console.log('Priority | Operation··········· | Active | Minions | Demand');
    console.log('---------+----------------------+--------+---------+-------');
    for (const op of gameState.operations.sort((a, b) =>
      a.priority == b.priority ? (b.active ? 1 : 0) - (a.active ? 1 : 0) : b.priority - a.priority
    )) {
      let out = (op.priority + '').padStart(8, '·');
      out += ' | ';
      out += op.name.padEnd(20, '·');
      out += ' | ';
      out += op.active ? 'true··' : 'false·';
      out += ' | ';
      out += (op.listAllAssignedMinions().length + '').padStart(7, '·');
      out += ' | ';
      out += (op.minionDemand + '').padStart(6, '·');
      console.log(out);
    }
  }
}
