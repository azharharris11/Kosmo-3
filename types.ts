
export interface ClientData {
  id: string; // Unique ID for batch processing
  clientName: string;
  rawText: string;
  files: File[];
  concerns: string;
  analysisDate: string; // Format YYYY-MM
  selectedModel: 'gemini-2.5-flash' | 'gemini-3-flash-preview' | 'gemini-3-pro-preview';
}

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

export type BatchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';

export interface BatchItem {
  client: ClientData;
  status: BatchStatus;
  resultContent: string;
  usage: UsageStats | null;
  error?: string;
}

export interface ReportState {
  isLoading: boolean;
  isStreaming: boolean;
  currentProcessingId: string | null; // Track which client is being processed
  batchItems: BatchItem[]; // Store all clients and their results
}

export enum Step {
  INPUT = 'INPUT',
  GENERATING = 'GENERATING',
  RESULT_LIST = 'RESULT_LIST', // New step: List of completed reports
  RESULT_VIEW = 'RESULT_VIEW', // New step: Viewing specific report
}
