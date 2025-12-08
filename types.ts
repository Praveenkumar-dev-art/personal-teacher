export type AppMode = 'diary' | 'tutor';

export interface Insight {
  text: string;
  relatedTopic?: string;
}

export interface TutorResponse {
  svg_content: string;
  speech_response: string;
  question: string;
  scaffolding_state: 'example' | 'problem' | 'fading';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  svg?: string;
}

export interface GeminiConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
}