export interface PostCreationRequest {
  fileId: number;
  caption: string;
}

export interface CreatePostFormState {
  caption: string;
  selectedSkillIds: string[];
}
