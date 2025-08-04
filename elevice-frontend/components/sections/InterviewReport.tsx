import React, { useState } from 'react';
import { ArrowLeft, Download, Share2, Clock, Target, TrendingUp, User, MessageSquare, Star, AlertCircle } from 'lucide-react';

interface InterviewReportData {
  id: string;
  interview_id: string;
  generated_at: string;
  completion_reason: string;
  total_questions: number;
  interview_duration_minutes: number | null;
  average_score: string;
  metric_scores: Record<string, any>;
  metric_trends: Record<string, any> | null;
  performance_summary: string;
  key_strengths: string[];
  areas_for_improvement: string[];
  improvement_recommendations: string[];
  question_types_covered: Record<string, number>;
  engagement_metrics: Record<string, any>;
  overall_assessment: string;
  confidence_score: number | null;
  hiring_recommendation: string;
  interviewer_notes: string | null;
  follow_up_areas: string[];
}

interface InterviewReportProps {
  reportData: InterviewReportData;
  jobTitle?: string;
  onBack: () => void;
  onStartNew: () => void;
}

const InterviewReport: React.FC<InterviewReportProps> = ({ 
  reportData, 
  jobTitle,
  onBack, 
  onStartNew 
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed' | 'metrics'>('summary');

  const handleDownloadReport = () => {
    const downloadData = {
      ...reportData,
      jobTitle,
      downloadedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(downloadData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-report-${reportData.interview_id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareReport = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Interview Report',
          text: `Interview Report\n\nOverall Assessment: ${reportData.overall_assessment}\n\nPerformance Summary: ${reportData.performance_summary}`,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      const shareText = `Interview Report\n\nOverall Assessment: ${reportData.overall_assessment}\n\nPerformance Summary: ${reportData.performance_summary}\n\nKey Strengths:\n${reportData.key_strengths.map(s => `• ${s}`).join('\n')}\n\nAreas for Improvement:\n${reportData.areas_for_improvement.map(i => `• ${i}`).join('\n')}`;
      navigator.clipboard.writeText(shareText);
      alert('Report copied to clipboard!');
    }
  };

  const getAssessmentColor = (assessment: string) => {
    if (assessment.toLowerCase().includes('excellent') || assessment.toLowerCase().includes('strong')) {
      return 'text-green-600 bg-green-50 border-green-200';
    } else if (assessment.toLowerCase().includes('good') || assessment.toLowerCase().includes('satisfactory')) {
      return 'text-blue-600 bg-blue-50 border-blue-200';
    } else if (assessment.toLowerCase().includes('borderline') || assessment.toLowerCase().includes('needs')) {
      return 'text-orange-600 bg-orange-50 border-orange-200';
    } else {
      return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const TabButton = ({ id, label, isActive }: { id: string; label: string; isActive: boolean }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      className={`px-6 py-3 font-medium text-sm uppercase tracking-wide transition-colors ${
        isActive
          ? 'bg-[#4A6D7C] text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F0F1F1]">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleShareReport}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </button>
              <button
                onClick={handleDownloadReport}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-normal text-black mb-2 uppercase tracking-wide">
            Interview Report
          </h1>
          <p className="text-lg text-[#4A6D7C]">
            {jobTitle && `${jobTitle} • `}
            Completed {new Date(reportData.generated_at).toLocaleDateString()}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 shadow-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-5 h-5 text-[#4A6D7C] mr-2" />
              <span className="text-2xl font-bold text-[#4A6D7C]">{reportData.total_questions}</span>
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">Questions</div>
          </div>
          
          <div className="bg-white p-4 shadow-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-[#4A6D7C] mr-2" />
              <span className="text-2xl font-bold text-[#4A6D7C]">
                {reportData.interview_duration_minutes ? Math.round(reportData.interview_duration_minutes) : 'N/A'}
              </span>
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">Minutes</div>
          </div>
          
          <div className="bg-white p-4 shadow-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-[#4A6D7C] mr-2" />
              <span className="text-2xl font-bold text-[#4A6D7C]">{reportData.average_score}</span>
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">Avg Score</div>
          </div>
          
          <div className="bg-white p-4 shadow-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <Star className="w-5 h-5 text-[#4A6D7C] mr-2" />
              <span className="text-2xl font-bold text-[#4A6D7C]">
                {reportData.confidence_score ? `${reportData.confidence_score}%` : 'N/A'}
              </span>
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">Confidence</div>
          </div>
        </div>

        {/* Overall Assessment Banner */}
        <div className={`p-6 border rounded-lg mb-8 ${getAssessmentColor(reportData.overall_assessment)}`}>
          <div className="flex items-center mb-3">
            <AlertCircle className="w-6 h-6 mr-3" />
            <h2 className="text-xl font-semibold uppercase tracking-wide">Overall Assessment</h2>
          </div>
          <p className="text-lg font-medium">{reportData.overall_assessment}</p>
        </div>

        {/* Tabbed Interface */}
        <div className="bg-white shadow-lg border mb-6">
          {/* Tab Headers */}
          <div className="flex border-b">
            <TabButton id="summary" label="Summary" isActive={activeTab === 'summary'} />
            <TabButton id="detailed" label="Detailed Analysis" isActive={activeTab === 'detailed'} />
            <TabButton id="metrics" label="Engagement Metrics" isActive={activeTab === 'metrics'} />
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-black mb-4 uppercase tracking-wide">Performance Summary</h2>
                  <p className="text-gray-700 leading-relaxed">{reportData.performance_summary}</p>
                </div>
                
                {/* Strengths and Improvements Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Key Strengths */}
                  <div className="bg-green-50 border border-green-200 p-6">
                    <h2 className="text-xl font-semibold text-green-800 mb-4 flex items-center uppercase tracking-wide">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      Key Strengths
                    </h2>
                    <ul className="space-y-3">
                      {reportData.key_strengths.map((strength, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-500 mr-2 mt-1">✓</span>
                          <span className="text-gray-700">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Areas for Improvement */}
                  <div className="bg-orange-50 border border-orange-200 p-6">
                    <h2 className="text-xl font-semibold text-orange-800 mb-4 flex items-center uppercase tracking-wide">
                      <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                      Areas for Improvement
                    </h2>
                    <ul className="space-y-3">
                      {reportData.areas_for_improvement.map((improvement, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-orange-500 mr-2 mt-1">→</span>
                          <span className="text-gray-700">{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Analysis Tab */}
            {activeTab === 'detailed' && (
              <div className="space-y-6">
                {/* Hiring Recommendation */}
                <div className="bg-blue-50 border border-blue-200 p-6">
                  <h2 className="text-xl font-semibold text-blue-800 mb-4 uppercase tracking-wide">Hiring Recommendation</h2>
                  <p className="text-gray-700 leading-relaxed">{reportData.hiring_recommendation}</p>
                </div>

                {/* Improvement Recommendations */}
                <div>
                  <h2 className="text-xl font-semibold text-black mb-4 uppercase tracking-wide">Improvement Recommendations</h2>
                  <div className="space-y-3">
                    {reportData.improvement_recommendations.map((recommendation, index) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 p-4">
                        <div className="flex items-start">
                          <span className="text-yellow-600 mr-2 mt-1">💡</span>
                          <span className="text-gray-700">{recommendation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Follow-up Areas */}
                {reportData.follow_up_areas.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-black mb-4 uppercase tracking-wide">Follow-up Areas</h2>
                    <div className="space-y-3">
                      {reportData.follow_up_areas.map((area, index) => (
                        <div key={index} className="bg-purple-50 border border-purple-200 p-4">
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-2 mt-1">🔍</span>
                            <span className="text-gray-700">{area}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interviewer Notes */}
                {reportData.interviewer_notes && (
                  <div>
                    <h2 className="text-xl font-semibold text-black mb-4 uppercase tracking-wide">Interviewer Notes</h2>
                    <div className="bg-gray-50 border border-gray-200 p-4">
                      <p className="text-gray-700 leading-relaxed">{reportData.interviewer_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Engagement Metrics Tab */}
            {activeTab === 'metrics' && (
              <div className="space-y-6">
                {/* Question Types Coverage */}
                <div>
                  <h2 className="text-xl font-semibold text-black mb-4 uppercase tracking-wide">Question Types Coverage</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(reportData.question_types_covered).map(([type, count]) => (
                      <div key={type} className="bg-blue-50 border border-blue-200 p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{count}</div>
                        <div className="text-sm text-blue-700 uppercase tracking-wide">{type}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div>
                  <h2 className="text-xl font-semibold text-black mb-4 uppercase tracking-wide">Engagement Metrics</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(reportData.engagement_metrics).map(([metric, value]) => (
                      <div key={metric} className="bg-green-50 border border-green-200 p-4">
                        <div className="text-lg font-semibold text-green-800 capitalize">
                          {metric.replace(/_/g, ' ')}
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {typeof value === 'number' ? value.toFixed(1) : value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Completion Reason */}
                <div>
                  <h2 className="text-xl font-semibold text-black mb-4 uppercase tracking-wide">Interview Completion</h2>
                  <div className="bg-gray-50 border border-gray-200 p-4">
                    <p className="text-gray-700">
                      <span className="font-medium">Completion Reason:</span> {reportData.completion_reason.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={onStartNew}
            className="bg-[#4A6D7C] text-white px-6 py-3 uppercase tracking-wide hover:bg-[#3A5A6B] transition-colors duration-200 border-0"
          >
            Start New Interview
          </button>
          <button
            onClick={onBack}
            className="bg-gray-500 text-white px-6 py-3 uppercase tracking-wide hover:bg-gray-600 transition-colors duration-200 border-0"
          >
            View History
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewReport;