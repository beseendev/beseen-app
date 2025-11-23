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
}
