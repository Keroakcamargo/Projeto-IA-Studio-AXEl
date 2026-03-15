
// Tipos específicos de atividades de vendas
export type ActivityType = 
  | 'insta_msg' 
  | 'insta_follow' 
  | 'speech'
  | 'referidos'
  | 'ligacoes'
  | 'insta_numbers' 
  | 'meeting_scheduled' 
  | 'meeting_done';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ActivityGoal {
  daily: number;
  weekly: number;
  monthly: number;
  enabled: boolean; 
}

export interface GoalOverride {
  id: string;
  type: ActivityType;
  date?: string; // ISO date string for daily override
  week?: string; // YYYY-Www for weekly override
  month?: string; // YYYY-MM for monthly override
  value: number;
  note?: string;
}

export interface SalesGoals {
  targets: Record<ActivityType, ActivityGoal>;
  activeDays: DayOfWeek[];
  overrides?: GoalOverride[];
  disabledDates?: string[]; // Array of ISO date strings (YYYY-MM-DD)
}

export interface SalesActivity {
  id: string;
  type: ActivityType;
  count: number;
  timestamp: Date;
}

export interface RankingUser {
  uid: string;
  displayName: string;
  photoURL: string;
  totalPoints: number;
  prevPeriodPoints: number; // Pontos do período anterior para comparação
  activitiesCount: number;
  activityDetails: Record<ActivityType, number>;
  isOnFire: boolean;
  trend: 'up' | 'down' | 'stable';
  vsTeamAverage: 'above' | 'below' | 'average';
}

export interface ActivityCardData {
  type: ActivityType;
  count: number;
  goal: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isToolCall?: boolean;
  activityCards?: ActivityCardData[];
  sources?: { title: string; url: string }[];
}

export interface KnowledgeFile {
  id: string;
  name: string;
  type: string;
  data: string; // Base64
}

export interface KnowledgeLink {
  id: string;
  url: string;
  title: string;
}

export interface AgentConfig {
  name: string;
  description: string;
  instructions: string;
  learnedKnowledge?: string; // NOVO: Conhecimento aprendido via chat
  knowledge: {
    text: string;
    files: KnowledgeFile[];
    diverseKnowledge: KnowledgeFile[]; 
    links: KnowledgeLink[];
  };
  specialties: {
    callAnalysis: string;
    callAnalysisFiles: KnowledgeFile[];
    objectionHandling: string;
    objectionHandlingFiles: KnowledgeFile[];
  };
  tools: {
    googleSearch: boolean;
    salesLogging: boolean;
    searchStrategy?: string;
  };
  voiceSettings?: {
    voiceName: string;
  };
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

// --- TIPOS PARA INSIGHTS ---

export interface InsightSource {
  id: string;
  name: string;
  type: 'file' | 'link';
  mimeType?: string; // Adicionado para suporte multimodal
  content: string; // Se for arquivo, será o Base64
  originalRef?: string; 
  summary?: string;
}

export interface InsightNote {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  sources: InsightSource[];
  notes: InsightNote[];
  createdAt: Date;
}

declare global {
  interface Window {
  }
}
