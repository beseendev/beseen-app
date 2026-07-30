export type SkillType = 'OFFENSIVE' | 'DEFENSIVE';

export type SkillCode =
  | 'AERIAL_PLAY'
  | 'BALL_CARRYING'
  | 'BALL_CONTROL'
  | 'DRIBBLING'
  | 'FINISHING'
  | 'SHORT_PASS'
  | 'LONG_PASS'
  | 'RECOVERY'
  | 'TACKLING'
  | 'INTERCEPTION'
  | 'ONE_V_ONE_DUEL'
  | 'AERIAL_DUEL'
  | 'PRESSING';

export interface Skill {
  id: string;
  code: SkillCode;
  name: string;
  type: SkillType;
}
