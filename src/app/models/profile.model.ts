import { ScoutAgeCategory, ScoutPosition, ScoutTypeOption } from './scout-profile.model';

export interface Profile {
  id: string;
  name: string;
  fullName: string;
  urlPerfil?: string | null;
  urlProfileImage?: string | null;
  role: 'JOGADOR' | 'CLUBE';
  dateOfBirth?: string;
  bio?: string;
  position?: string;
  height?: string;
  weight?: string;
  careerHistory?: string;
  clubName?: string;
  areaOfExpertise?: string;
}

export interface ProfilePlayerCreationRequest {
  role: 'JOGADOR';
  documentNumber: string;
  phoneNumber: string;
  dateOfBirth: string;
  bio?: string;
  position?: string;
  height?: string;
  weight?: string;
  careerHistory?: string;
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
  sobreMim: string;
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
  fullName: string;
  firstName: string;
  lastName: string;
  urlProfileImage?: string;
}
