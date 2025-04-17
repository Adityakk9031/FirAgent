// FIR Types
export interface FIR {
  id: number;
  firId: string;
  crime: string;
  ipcSections: string[];
  summary: string;
  priority: number;
  dateTime?: string;
  location?: string;
  status: string;
  createdAt: string;
}

export interface GeminiResponse {
  crime: string;
  ipcSections: string[];
  summary: string;
  priority: number;
  firId?: string;
}

export interface StatusUpdate {
  id: number;
  firId: string;
  status: string;
  description: string;
  timestamp: string;
}

// Message Types
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'system';
  type?: 'text' | 'json';
}

// Chat Types
export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentFir: FIR | null;
  geminiResponse: GeminiResponse | null;
}
