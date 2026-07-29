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

export const SKILL_CATALOG: readonly Skill[] = [
  { id: 'AERIAL_PLAY', code: 'AERIAL_PLAY', name: 'Jogo aéreo', type: 'OFFENSIVE' },
  { id: 'BALL_CARRYING', code: 'BALL_CARRYING', name: 'Condução de bola', type: 'OFFENSIVE' },
  { id: 'BALL_CONTROL', code: 'BALL_CONTROL', name: 'Domínio', type: 'OFFENSIVE' },
  { id: 'DRIBBLING', code: 'DRIBBLING', name: 'Drible', type: 'OFFENSIVE' },
  { id: 'FINISHING', code: 'FINISHING', name: 'Finalização', type: 'OFFENSIVE' },
  { id: 'SHORT_PASS', code: 'SHORT_PASS', name: 'Passe curto', type: 'OFFENSIVE' },
  { id: 'LONG_PASS', code: 'LONG_PASS', name: 'Passe longo', type: 'OFFENSIVE' },
  { id: 'RECOVERY', code: 'RECOVERY', name: 'Recuperação', type: 'DEFENSIVE' },
  { id: 'TACKLING', code: 'TACKLING', name: 'Desarme', type: 'DEFENSIVE' },
  { id: 'INTERCEPTION', code: 'INTERCEPTION', name: 'Interceptação', type: 'DEFENSIVE' },
  { id: 'ONE_V_ONE_DUEL', code: 'ONE_V_ONE_DUEL', name: 'Duelo 1x1', type: 'DEFENSIVE' },
  { id: 'AERIAL_DUEL', code: 'AERIAL_DUEL', name: 'Duelo aéreo', type: 'DEFENSIVE' },
  { id: 'PRESSING', code: 'PRESSING', name: 'Pressão', type: 'DEFENSIVE' },
];
