export const Major_Role_Harvest = 'harvest';
export const Major_Role_Attack = 'attack';
export const Major_Role_Defend = 'defend';
export const Major_Role_Unassigned = 'unassigned';
export const Minor_Role_Harvest_Gather = 'harvest:gather';
export const Minor_Role_Harvest_Return = 'harvest:return';
export const Minor_Role_Harvest_Flee = 'harvest:flee';
export const Minor_Role_Harvest_Retaliate = 'harvest:retaliate';
export const Minor_Role_Attack_Reload = 'attack:reload';
export const Minor_Role_Attack_Muster = 'attack:muster';
export const Minor_Role_Attack_Charge = 'attack:charge';

export type Major_Roles =
  | typeof Major_Role_Harvest
  | typeof Major_Role_Attack
  | typeof Major_Role_Defend
  | typeof Major_Role_Unassigned;

export type Minor_Harvest_Roles =
  | typeof Minor_Role_Harvest_Gather
  | typeof Minor_Role_Harvest_Return
  | typeof Minor_Role_Harvest_Flee
  | typeof Minor_Role_Harvest_Retaliate;

export type Minor_Attack_Roles =
  | typeof Minor_Role_Attack_Reload
  | typeof Minor_Role_Attack_Muster
  | typeof Minor_Role_Attack_Charge;

export type Minor_Roles = Minor_Harvest_Roles | Minor_Attack_Roles | '';

export interface IRole {
  major: Major_Roles;
  minor: Minor_Roles;
}

export function shoutRoleChange(spirit: Spirit, role: IRole): void {
  if (role.minor == '') {
    spirit.shout(role.major);
    return;
  }

  spirit.shout(role.minor);

  // TODO: Flair
  // TODO: Log levels
}
