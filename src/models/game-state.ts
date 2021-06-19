import { FriendlyBase, HostileBase, NeutralOutpost } from './bases';
import { IBot } from './bot';
import { Hostile } from './hostile';
import { Minion } from './minion';
import { IOperation } from './operation';

export interface IGameState {
  readonly minions: Minion[];
  readonly unassignedMinions: Minion[];
  readonly aliveMinions: Minion[];
  readonly deadMinions: Minion[];
  readonly hostiles: Hostile[];

  readonly homeBase: FriendlyBase;
  readonly hostileBase: HostileBase;
  readonly outpost: NeutralOutpost;

  readonly homeStar: LargeStar;
  readonly hostileStar: LargeStar;
  readonly neutralStar: SmallStar;

  readonly bot: IBot;
  readonly operations: IOperation[];

  getMinion: (id: string) => Minion;
  getHostile: (id: string) => Hostile;
}
