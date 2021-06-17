import { getMinionState, IMinionState } from './mininon-state';
import { IRole, shoutRoleChange } from './role';
import { SpiritBase } from './spirit-base';

export class Minion extends SpiritBase {
  private state: IMinionState;
  private initialRole: IRole;
  private isEnergizingSomething = false;
  private isShouting = false;

  constructor(spirit: Spirit) {
    super(spirit);
    this.state = getMinionState(spirit.id);
    this.initialRole = { ...this.state.role };
  }

  public shout(message: string): void {
    this.isShouting = true;
    this.spirit.shout(message);
  }

  public runFinalSteps(): void {
    if (!this.isEnergizingSomething) {
      // passive recharge (if possible)
      this.isEnergizingSomething = true;
      this.spirit.energize(this.spirit);
    }

    if (
      !this.isShouting &&
      (this.initialRole.major != this.state.role.major || this.initialRole.minor != this.state.role.minor)
    ) {
      this.isShouting = true;
      shoutRoleChange(this.spirit, this.state.role);
    }
  }
}
