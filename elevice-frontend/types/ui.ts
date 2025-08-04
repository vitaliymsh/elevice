// UI component types
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
}

export interface ConversationHistoryProps {
  conversation: any[];
  transcriptContainerRef: React.RefObject<HTMLDivElement | null>;
  showScrollToBottom: boolean;
  scrollToBottom: () => void;
}

export interface MicrophoneButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onToggleRecording: () => void;
  disabled?: boolean;
}

export interface SessionPageHeaderProps {
  onBackToMenu: () => void;
  onToggleHistory: () => void;
  showHistory: boolean;
}
