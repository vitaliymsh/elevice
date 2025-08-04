import { type InterviewType, type MetricData } from "@/types/interview";
import SessionSpeechAnalysis from "../../../../components/common/SessionSpeechAnalysis";
import { TechnicalSpeechAnalysisResponse } from "@/types/api/api";


function BackendStatusBadge({ backendStatus }: { backendStatus: 'checking' | 'connected' | 'error' }) {
  return (
    <span className={`ml-4 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider
      ${backendStatus === 'checking' ? 'bg-gray-200 text-gray-700' : ''}
      ${backendStatus === 'connected' ? 'bg-green-200 text-green-800' : ''}
      ${backendStatus === 'error' ? 'bg-red-200 text-red-800' : ''}`}>
      {backendStatus === 'checking' && 'CONNECTING...'}
      {backendStatus === 'connected' && 'CONNECTED'}
      {backendStatus === 'error' && 'DISCONNECTED'}
    </span>
  );
}


const SessionPageHeader = ({
  onBack,
  questionIndex,
  totalQuestions,
  isMockMode,
  backendStatus,
  onStopInterview,
  jobTitle,
  speechAnalysis,
  metrics,
  isCompleted
}: {
  onBack: () => void;
  questionIndex: number;
  totalQuestions: number;
  isMockMode: boolean;
  backendStatus: 'checking' | 'connected' | 'error';
  onStopInterview?: () => void;
  jobTitle?: string;
  speechAnalysis?: TechnicalSpeechAnalysisResponse;
  metrics?: MetricData;
  isCompleted: boolean;
}) => (
  <div className="bg-white p-6 border-b border-gray-200 h-full">
    <div className="max-w-6xl mx-auto justify-between items-center grid grid-cols-3">
      <div className="flex flex-row justify-between">
        <button onClick={onBack} className="text-[#4A6D7C] uppercase tracking-wide hover:text-[#3A5A6B] transition-colors duration-200 min-w-fit">
          ← BACK
        </button>
      </div>
      <div className="flex justify-center max-w-full">
        <div className="flex flex-col items-start w-full min-w-0">
          <div className="text-black uppercase tracking-wide font-normal min-w-fit">
            Q{questionIndex} OF {totalQuestions}
            <BackendStatusBadge backendStatus={backendStatus} />
          </div>
          {jobTitle && (
            <div className="text-sm text-[#4A6D7C] uppercase tracking-wide mt-1 w-full truncate" title={jobTitle}>
            JOB: {jobTitle}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-row justify-end">
        {!isCompleted && (
          <button
            onClick={onStopInterview || onBack}
            className="bg-transparent text-[#4A6D7C] px-6 py-2 text-sm uppercase tracking-wide border border-[#4A6D7C] hover:bg-[#4A6D7C] hover:text-white transition-colors duration-200"
          >
            END INTERVIEW
          </button>
        )}
      </div>
    </div>
  </div>
);

export default SessionPageHeader;
