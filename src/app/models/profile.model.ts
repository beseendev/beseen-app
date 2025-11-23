export interface Profile {
  id: string;
  name: string; // From user.name
  fullName: string;
  urlPerfil?: string; // Profile image URL
  role: 'JOGADOR' | 'CLUBE';
  dateOfBirth?: string; // YYYY-MM-DD format
  bio?: string;
  position?: string; // Player specific
  height?: string; // Player specific
  weight?: string; // Player specific
  careerHistory?: string; // Player specific
  // Add other properties that might be returned by the backend, like follower counts, etc.
  // For now, let's assume these are sufficient.
}
