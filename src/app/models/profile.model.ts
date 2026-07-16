import { ScoutAgeCategory, ScoutPosition, ScoutTypeOption } from './scout-profile.model';

export interface Profile {
  id: string;
  name: string;
  fullName: string;
  urlPerfil?: string | null;
  urlProfileImage?: string | null;
  fotoPerfilUrl?: string | null;
  urlCoverImage?: string | null;
  role: 'JOGADOR' | 'CLUBE';
  dateOfBirth?: string;
  bio?: string;
  documentNumber?: string;
  phoneNumber?: string;

  position?: string;
  height?: string;
  weight?: string;
  careerHistory?: string;
  dominantFoot?: 'RIGHT' | 'LEFT' | 'BOTH';

  tipoOlheiro?: ScoutTypeOption;
  tipoOlheiroOutroTexto?: string | null;
  organizacaoOuClube?: string | null;
  cargoOuFuncao?: string | null;
  cidade?: string | null;
  estado?: string | null;
  pais?: string | null;
  modalidade?: string | null;
  categoriasIdadeAlvo?: ScoutAgeCategory[];
  posicoesInteresse?: ScoutPosition[];
  regiaoAtuacaoTexto?: string | null;
  linkReferencia?: string | null;
  oQueBuscaNoBeSeen?: string | null;
  documentoVerificado?: boolean;
  aceitouTermos?: boolean;

  /** Indica se o usuário logado bloqueou este perfil (retornado pelo backend). */
  blockedByMe?: boolean;
}

export interface ProfilePlayerCreationRequest {
  role: 'JOGADOR';
  documentNumber: string;
  phoneNumber: string;
  dateOfBirth: string;
  cidade: string;
  estado: string;
  pais: string;
  bio?: string;
  position?: string;
  height?: string;
  weight?: string;
  careerHistory?: string;
  dominantFoot?: 'RIGHT' | 'LEFT' | 'BOTH';
}

export interface ProfileScoutCreationRequest {
  role: 'CLUBE';
  documentNumber: string;
  dateOfBirth: string;
  fotoPerfilUrl?: string | null;
  tipoOlheiro: ScoutTypeOption;
  tipoOlheiroOutroTexto?: string | null;
  organizacaoOuClube?: string | null;
  cargoOuFuncao?: string | null;
  telefoneWhatsapp: string;
  cidade: string;
  estado: string;
  pais: string;
  modalidade: string;
  categoriasIdadeAlvo: ScoutAgeCategory[];
  posicoesInteresse: ScoutPosition[];
  regiaoAtuacaoTexto: string;
  documentoVerificado: boolean;
  documentoUploadId?: string | null;
  linkReferencia?: string | null;
  aceitouTermos: boolean;
  bio: string;
  oQueBuscaNoBeSeen?: string | null;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ProfileResponse {
  id: number;
  name: string;
  fullName: string;
  urlProfileImage?: string;
  urlCoverImage?: string;
  role: string;
  dateOfBirth?: string;
  bio?: string;
  documentNumber?: string;
  phoneNumber?: string;

  position?: string;
  height?: string;
  weight?: string;
  careerHistory?: string;
  dominantFoot?: 'RIGHT' | 'LEFT' | 'BOTH';

  tipoOlheiro?: string;
  tipoOlheiroOutroTexto?: string;
  organizacaoOuClube?: string;
  cargoOuFuncao?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  modalidade?: string;
  categoriasIdadeAlvo?: string[];
  posicoesInteresse?: string[];
  regiaoAtuacaoTexto?: string;
  linkReferencia?: string;
  oQueBuscaNoBeSeen?: string;
  documentoVerificado?: boolean;
  aceitouTermos?: boolean;
}
