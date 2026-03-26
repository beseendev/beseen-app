export interface ScoutProfile {
  documentNumber: string;
  fotoPerfilUrl?: string | null;
  tipoOlheiro: ScoutTypeOption;
  tipoOlheiroOutroTexto?: string | null;
  organizacaoOuClube?: string | null;
  cargoOuFuncao?: string | null;
  dateOfBirth: string;
  telefoneWhatsapp: string;
  cidade: string;
  estado: string;
  pais: string;
  idioma?: ScoutLanguageOption | null;
  modalidade: ScoutSportOption;
  categoriasIdadeAlvo: ScoutAgeCategory[];
  posicoesInteresse: ScoutPosition[];
  regiaoAtuacaoTexto: string;
  documentoVerificado: boolean;
  documentoUploadId?: string | null;
  linkReferencia?: string | null;
  aceitouTermos: boolean;
  sobreMim: string;
  oQueBuscaNoBeSeen?: string | null;
}

export type ScoutTypeOption =
  | 'Clube'
  | 'Empresario'
  | 'Agente'
  | 'Scout independente'
  | 'Academia'
  | 'Outro';

export type ScoutLanguageOption = 'pt' | 'en' | 'es';

export type ScoutSportOption = 'Futebol de campo' | 'Futsal' | 'Futebol 7';

export type ScoutAgeCategory =
  | 'Sub-11'
  | 'Sub-13'
  | 'Sub-15'
  | 'Sub-17'
  | 'Sub-20'
  | 'Profissional';

export type ScoutPosition =
  | 'Goleiro'
  | 'Zagueiro'
  | 'Lateral'
  | 'Volante'
  | 'Meia'
  | 'Atacante'
  | 'Ponta';

export const SCOUT_TYPE_OPTIONS: ScoutTypeOption[] = [
  'Clube',
  'Empresario',
  'Agente',
  'Scout independente',
  'Academia',
  'Outro'
];

export const SCOUT_MODALITY_OPTIONS: ScoutSportOption[] = [
  'Futebol de campo',
  'Futsal',
  'Futebol 7'
];

export const SCOUT_AGE_CATEGORIES: ScoutAgeCategory[] = [
  'Sub-11',
  'Sub-13',
  'Sub-15',
  'Sub-17',
  'Sub-20',
  'Profissional'
];

export const SCOUT_POSITION_OPTIONS: ScoutPosition[] = [
  'Goleiro',
  'Zagueiro',
  'Lateral',
  'Volante',
  'Meia',
  'Atacante',
  'Ponta'
];

export const BR_STATE_OPTIONS: string[] = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
  'Exterior/Outro'
];
