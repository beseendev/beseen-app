export interface PostCreationRequest {
  fileId: number;
  caption: string;
  skillIds: number[];
}

export interface CreatePostFormState {
  caption: string;
  selectedSkillIds: string[];
}
