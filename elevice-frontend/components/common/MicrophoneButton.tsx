import { Mic, MicOff, X } from "lucide-react";

const MicrophoneButton = ({
  micState,
  isInterviewStarted,
  backendStatus,
  onClick,
  disabled = false,
  isAutoAnswering = false,
  isGeneratingAnswer = false,
  isPlayingAudio = false,
  disabledMessage,
}: {
  micState: 'idle' | 'generating' | 'recording' | 'processing';
  isInterviewStarted: boolean;
  backendStatus: 'checking' | 'connected' | 'error';
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  isAutoAnswering?: boolean;
  isGeneratingAnswer?: boolean;
  isPlayingAudio?: boolean;
  disabledMessage?: string;
}) => {
  const getMicButtonText = () => {
    if (isPlayingAudio) return 'PLAYING... TAP TO STOP';
    if (disabled) return disabledMessage || 'PLEASE WAIT...';
    if (backendStatus === 'checking') return 'CONNECTING...';
    if (backendStatus === 'error') return 'ERROR: REFRESH PAGE';
    
    if (!isInterviewStarted) return 'START INTERVIEW FIRST';
    
    if (isAutoAnswering) {
      switch (micState) {
        case "idle":
          return "TAP FOR AUTO ANSWER";
        case "generating":
          return "GENERATING QUESTION...";
        case "processing":
          return isGeneratingAnswer ? "GENERATING ANSWER..." : "PROCESSING ANSWER...";
        default:
          return "TAP FOR AUTO ANSWER";
      }
    } else {
      switch (micState) {
        case "idle":
          return "TAP TO ANSWER";
        case "generating":
          return "GENERATING QUESTION...";
        case "recording":
          return "LISTENING... TAP TO STOP";
        case "processing":
          return "PROCESSING YOUR ANSWER...";
        default:
          return "TAP TO ANSWER";
      }
    }
  };

  const getMicButtonClass = () => {
    const baseClass = "w-16 h-16 rounded-full flex flex-col items-center justify-center text-sm uppercase tracking-wide font-normal transition-all duration-300 border-0";
    if (isPlayingAudio) {
      return `${baseClass} bg-red-500 text-white hover:bg-red-600`;
    }
    if (disabled || backendStatus !== 'connected') {
      return `${baseClass} bg-gray-400 text-gray-700 cursor-not-allowed`;
    }
    switch (micState) {
      case "recording":
        return `${baseClass} bg-[#4A6D7C] text-white animate-pulse`;
      case "generating":
      case "processing":
        return `${baseClass} bg-[#4A6D7C] text-white`;
      default:
        return `${baseClass} bg-white text-black border-2 border-black hover:bg-[#F0F1F1]`;
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <button
        onClick={onClick}
        className={getMicButtonClass()}
        disabled={micState === "generating" || micState === "processing" || backendStatus !== 'connected' || disabled}
      >
        {isPlayingAudio ? (
          <X className="w-6 h-6" />
        ) : micState === "recording" ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>
      <div className="text-center text-sm text-[#4A6D7C] uppercase tracking-wide max-w-xs">
        {getMicButtonText()}
      </div>
    </div>
  );
};

export default MicrophoneButton;
