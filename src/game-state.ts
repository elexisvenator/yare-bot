import { Hostile } from './models/hostile';
import { Minion } from './models/minion';
import { ISpirit } from './models/spirit';

export class GameState {
  private readonly spirits: Record<string, ISpirit>;

  public readonly minions: Minion[];
  public readonly hostiles: Hostile[];

  public readonly homeBase: Base = base;
  public readonly hostileBase: Base = enemy_base;
  public readonly outpost: Outpost = outpost_mdo;

  public readonly homeStar: LargeStar = star_zxq;
  public readonly hostileStar: LargeStar = star_a1c;
  public readonly neutralStar: SmallStar = star_p89;

  constructor() {
    this.spirits = Object.values(spirits)
      .map((s) => (s.player_id == this_player_id ? new Minion(s) : new Hostile(s)))
      .reduce((map, s) => ((map[s.id] = s), map), {} as Record<string, ISpirit>);

    this.minions = Object.values(this.spirits)
      .filter((s) => s instanceof Minion)
      .map((s) => s as Minion);

    this.hostiles = Object.values(this.spirits)
      .filter((s) => s instanceof Hostile)
      .map((s) => s as Hostile);
  }

  public getMinion(id: string): Minion {
    return this.spirits[id] as Minion;
  }

  public getHostile(id: string): Hostile {
    return this.spirits[id] as Hostile;
  }
}
