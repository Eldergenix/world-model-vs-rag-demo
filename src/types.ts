export interface Message {
  id: string;
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface ChatState {
  messages: Message[];
  isGenerating: boolean;
  status?: string;
  latencyMs?: number;
  timeToFirstTokenMs?: number;
}
