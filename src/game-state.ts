import { FriendlyBase, HostileBase, NeutralOutpost } from './models/bases';
import { IBot, IBotConstructor } from './models/bot';
import { ISpirit } from './models/core';
import { IGameState } from './models/game-state';
import { Hostile } from './models/hostile';
import { GameMemory } from './models/memory';
import { Minion } from './models/minion';
import { IOperation } from './models/operation';

export class GameState implements IGameState {
  private readonly spirits: Record<string, ISpirit>;
  private readonly memory: GameMemory;

  public readonly minions: Minion[];
  public readonly hostiles: Hostile[];

  public readonly homeBase: FriendlyBase = new FriendlyBase(base);
  public readonly hostileBase: HostileBase = new HostileBase(enemy_base);
  public readonly outpost: NeutralOutpost = new NeutralOutpost(outpost_mdo);

  public readonly homeStar: LargeStar = star_zxq;
  public readonly hostileStar: LargeStar = star_a1c;
  public readonly neutralStar: SmallStar = star_p89;

  constructor(botClass: IBotConstructor) {
    this.memory = memory as GameMemory;
    // initial setup
    this.memory.minions = this.memory.minions || {};
    this.memory.operations = this.memory.operations || [];

    this.spirits = Object.values(spirits)
      .map((s) => {
        if (s.player_id != this_player_id) return new Hostile(s);

        if (!(s.id in this.memory.minions)) {
          // default minion state
          this.memory.minions[s.id] = {
            allocatedTo: null,
          };
        }

        return new Minion(s, this.memory.minions[s.id]);
      })
      .reduce((map, s) => ((map[s.id] = s), map), {} as Record<string, ISpirit>);

    this.minions = Object.values(this.spirits)
      .filter((s) => s instanceof Minion)
      .map((s) => s as Minion);

    this.hostiles = Object.values(this.spirits)
      .filter((s) => s instanceof Hostile)
      .map((s) => s as Hostile);

    this.memory.bot = this.memory.bot || new botClass(this);
  }

  public get bot(): IBot {
    return this.memory.bot;
  }

  public get operations(): IOperation[] {
    return this.memory.operations;
  }

  public get unassignedMinions(): Minion[] {
    return this.minions.filter((m) => m.alive && m.operation == null);
  }

  public get aliveMinions(): Minion[] {
    return this.minions.filter((m) => m.alive);
  }

  public get deadMinions(): Minion[] {
    return this.minions.filter((m) => !m.alive);
  }

  public getMinion(id: string): Minion {
    return this.spirits[id] as Minion;
  }

  public getHostile(id: string): Hostile {
    return this.spirits[id] as Hostile;
  }
}
