import { FriendlyBase, HostileBase, NeutralOutpost } from './bases';
import { IBot, IBotConstructor } from './bot';
import { ISpirit } from './core';
import { Hostile } from './hostile';
import { GameMemory } from './memory';
import { Minion } from './minion';
import { IOperation } from './operation';
import { GameStar } from './star';

export interface IGameState {
  readonly minions: Minion[];
  readonly unassignedMinions: Minion[];
  readonly aliveMinions: Minion[];
  readonly deadMinions: Minion[];
  readonly hostiles: Hostile[];

  readonly homeBase: FriendlyBase;
  readonly hostileBase: HostileBase;
  readonly outpost: NeutralOutpost;

  readonly homeStar: GameStar;
  readonly hostileStar: GameStar;
  readonly neutralStar: GameStar;

  readonly clock: number;
  readonly bot: IBot;
  readonly operations: IOperation[];

  getMinion: (id: string) => Minion;
  getHostile: (id: string) => Hostile;
}

export class GameState implements IGameState {
  private readonly spirits: Record<string, ISpirit>;
  private readonly memory: GameMemory;

  public readonly minions: Minion[];
  public readonly hostiles: Hostile[];

  public readonly homeBase: FriendlyBase = new FriendlyBase(base);
  public readonly hostileBase: HostileBase = new HostileBase(enemy_base);
  public readonly outpost: NeutralOutpost = new NeutralOutpost(outpost_mdo);

  public readonly homeStar: GameStar;
  public readonly hostileStar: GameStar;
  public readonly neutralStar: GameStar;

  constructor(botClass: IBotConstructor) {
    this.memory = memory as GameMemory;
    // initial setup
    this.memory.minions = this.memory.minions || {};
    this.memory.operations = this.memory.operations || [];
    this.memory.clock = this.memory.clock || 0;
    this.memory.clock += 1;

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
    this.homeStar = new GameStar(this, star_zxq);
    this.hostileStar = new GameStar(this, star_a1c);
    this.neutralStar = new GameStar(this, star_p89, 100);

    // initialise bot
    this.memory.bot = this.memory.bot || new botClass(this);
  }

  public get clock(): number {
    return this.memory.clock;
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
