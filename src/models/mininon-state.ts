import { IRole } from './role';

export interface IMinionState {
  role: IRole;
}

export function getMinionState(id: string): IMinionState {
  let state = memory[id] as IMinionState;
  if (state == null || state == undefined) {
    state = {
      role: {
        major: 'unassigned',
        minor: '',
      },
    };
    memory[id] = state;
  }

  return state;
}
