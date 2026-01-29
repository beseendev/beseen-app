export interface Profile {
  id: string;
  name: string;
  fullName: string;
  urlPerfil?: string;
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
  bio?: string;
  position?: string;
  height?: string;
  weight?: string;
  careerHistory?: string;
  documentNumber: string;
  phoneNumber: string;
  dateOfBirth: string;
  role: 'JOGADOR';
}

export interface ProfileScoutCreationRequest {
  bio?: string;
  areaOfExpertise?: string;
  clubName?: string;
  documentNumber: string;
  phoneNumber: string;
  dateOfBirth: string;
  role: 'CLUBE';
}
