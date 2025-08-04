"""
Interview Agent Tools
====================

Database integration tools for the interview agent.
Provides structured access to interview data and candidate history.
"""

from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
import logging
import uuid

logger = logging.getLogger(__name__)

class InterviewTools:
    """
    Database tools for the interview agent.
    
    Provides structured access to:
    - Interview history and patterns
    - Candidate performance data
    - Job requirements and context
    - Industry benchmarks from previous interviews
    """
    
    def __init__(self, database_manager):
        self.db = database_manager
        
    async def get_candidate_history(
        self, 
        user_id: uuid.UUID, 
        job_type: Optional[str] = None,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Get candidate's interview history to inform current strategy.
        
        Args:
            user_id: Candidate's user ID
            job_type: Optional filter by job type
            limit: Maximum number of interviews to retrieve
            
        Returns:
            Dictionary with candidate history and patterns
        """
        try:
            # Get candidate's previous interviews
            interviews = await self.db.get_user_interviews(user_id, limit=limit)
            
            if not interviews:
                return {
                    "has_history": False,
                    "previous_interviews": 0,
                    "patterns": {},
                    "recommendations": ["Standard first-time interview approach"]
                }
            
            # Analyze patterns across interviews
            performance_pattern = await self._analyze_performance_patterns(interviews)
            weakness_patterns = await self._identify_recurring_weaknesses(interviews)
            strength_patterns = await self._identify_consistent_strengths(interviews)
            
            return {
                "has_history": True,
                "previous_interviews": len(interviews),
                "performance_pattern": performance_pattern,
                "recurring_weaknesses": weakness_patterns,
                "consistent_strengths": strength_patterns,
                "recommendations": self._generate_history_based_recommendations(
                    performance_pattern, weakness_patterns, strength_patterns
                ),
                "last_interview_date": interviews[0].created_at if interviews else None
            }
            
        except Exception as e:
            logger.error(f"Error getting candidate history: {e}")
            return {
                "has_history": False,
                "error": str(e),
                "recommendations": ["Use standard interview approach due to data retrieval error"]
            }
    
    async def get_job_context_data(
        self, 
        job_id: Optional[uuid.UUID] = None,
        interview_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive job context including requirements and benchmarks.
        
        Args:
            job_id: Specific job ID if available
            interview_type: Job type for general context
            
        Returns:
            Job context with requirements and benchmarks
        """
        try:
            context = {
                "job_specific": False,
                "requirements": [],
                "benchmarks": {},
                "similar_interviews": []
            }
            
            if job_id:
                # Get specific job details
                job = await self.db.get_job_by_id(job_id)
                if job:
                    context.update({
                        "job_specific": True,
                        "job_title": job.name,
                        "job_description": job.description,
                        "position_level": job.position,
                        "requirements": self._extract_requirements_from_description(job.description)
                    })
                    
                    # Get performance benchmarks from similar interviews
                    similar_interviews = await self.db.get_job_interview_history(
                        job_id=job_id,
                        max_interviews=10
                    )
                    
                    if similar_interviews:
                        benchmarks = await self._calculate_job_benchmarks(similar_interviews)
                        context["benchmarks"] = benchmarks
                        context["similar_interviews"] = len(similar_interviews)
            
            elif interview_type:
                # Get general benchmarks for interview type
                similar_interviews = await self.db.get_interviews_by_type(
                    interview_type=interview_type,
                    limit=20
                )
                
                if similar_interviews:
                    benchmarks = await self._calculate_type_benchmarks(similar_interviews)
                    context["benchmarks"] = benchmarks
                    context["interview_type"] = interview_type
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting job context: {e}")
            return {
                "job_specific": False,
                "error": str(e),
                "requirements": [],
                "benchmarks": {}
            }
    
    async def get_performance_insights(
        self, 
        current_scores: Dict[str, float],
        interview_type: str,
        question_count: int
    ) -> Dict[str, Any]:
        """
        Get performance insights compared to benchmarks.
        
        Args:
            current_scores: Current performance scores
            interview_type: Type of interview for comparison
            question_count: Number of questions asked so far
            
        Returns:
            Performance insights and recommendations
        """
        try:
            # Get benchmark data for this interview type
            benchmark_data = await self._get_benchmark_data(interview_type, question_count)
            
            insights = {
                "performance_vs_benchmark": {},
                "areas_of_concern": [],
                "areas_of_strength": [],
                "recommendations": [],
                "confidence_level": 0.5
            }
            
            # Compare current performance to benchmarks
            for metric, score in current_scores.items():
                benchmark_score = benchmark_data.get(metric, {}).get("average", 50)
                benchmark_std = benchmark_data.get(metric, {}).get("std_dev", 15)
                
                z_score = (score - benchmark_score) / max(benchmark_std, 1)
                
                insights["performance_vs_benchmark"][metric] = {
                    "current_score": score,
                    "benchmark_average": benchmark_score,
                    "z_score": z_score,
                    "relative_performance": self._interpret_z_score(z_score)
                }
                
                # Identify areas of concern and strength
                if z_score < -1.0:  # More than 1 std dev below average
                    insights["areas_of_concern"].append({
                        "metric": metric,
                        "severity": "high" if z_score < -1.5 else "moderate",
                        "recommendation": f"Focus heavily on {metric} improvement"
                    })
                elif z_score > 1.0:  # More than 1 std dev above average
                    insights["areas_of_strength"].append({
                        "metric": metric,
                        "strength_level": "high" if z_score > 1.5 else "moderate"
                    })
            
            # Generate overall recommendations
            insights["recommendations"] = self._generate_performance_recommendations(insights)
            insights["confidence_level"] = self._calculate_insight_confidence(
                question_count, len(current_scores), benchmark_data
            )
            
            return insights
            
        except Exception as e:
            logger.error(f"Error getting performance insights: {e}")
            return {
                "performance_vs_benchmark": {},
                "areas_of_concern": [],
                "areas_of_strength": [],
                "recommendations": ["Unable to generate insights due to data error"],
                "error": str(e)
            }
    
    async def get_question_optimization_data(
        self,
        covered_topics: List[str],
        current_performance: Dict[str, float],
        interview_type: str
    ) -> Dict[str, Any]:
        """
        Get data to optimize next question selection.
        
        Args:
            covered_topics: Topics already covered
            current_performance: Current performance scores
            interview_type: Type of interview
            
        Returns:
            Optimization data for question selection
        """
        try:
            # Get successful question patterns for this interview type
            successful_patterns = await self._get_successful_question_patterns(
                interview_type, current_performance
            )
            
            # Get topic coverage analysis
            topic_analysis = await self._analyze_topic_coverage(
                covered_topics, interview_type
            )
            
            # Get difficulty optimization suggestions
            difficulty_suggestions = await self._get_difficulty_suggestions(
                current_performance, interview_type
            )
            
            return {
                "successful_patterns": successful_patterns,
                "topic_gaps": topic_analysis["gaps"],
                "recommended_topics": topic_analysis["recommendations"],
                "difficulty_adjustment": difficulty_suggestions,
                "question_strategies": self._get_question_strategies(current_performance)
            }
            
        except Exception as e:
            logger.error(f"Error getting question optimization data: {e}")
            return {
                "successful_patterns": [],
                "topic_gaps": [],
                "recommended_topics": [],
                "difficulty_adjustment": "maintain",
                "error": str(e)
            }
    
    # Private helper methods
    
    async def _analyze_performance_patterns(self, interviews: List[Any]) -> Dict[str, Any]:
        """Analyze performance patterns across interviews."""
        if not interviews:
            return {"trend": "no_data", "consistency": 0}
        
        # Get final reports for interviews
        patterns = {
            "trend": "stable",
            "consistency": 0.5,
            "improvement_areas": [],
            "persistent_strengths": []
        }
        
        scores = []
        for interview in interviews:
            try:
                report = await self.db.get_final_report(interview.interview_id)
                if report and report.average_score:
                    scores.append(report.average_score)
            except Exception:
                continue
        
        if len(scores) >= 2:
            # Calculate trend
            if scores[0] > scores[-1] + 5:
                patterns["trend"] = "improving"
            elif scores[0] < scores[-1] - 5:
                patterns["trend"] = "declining"
            
            # Calculate consistency (lower std dev = higher consistency)
            if len(scores) > 1:
                mean_score = sum(scores) / len(scores)
                variance = sum((score - mean_score) ** 2 for score in scores) / len(scores)
                std_dev = variance ** 0.5
                patterns["consistency"] = max(0, 1 - (std_dev / 50))  # Normalize to 0-1
        
        return patterns
    
    async def _identify_recurring_weaknesses(self, interviews: List[Any]) -> List[str]:
        """Identify weaknesses that appear across multiple interviews."""
        weakness_counts = {}
        
        for interview in interviews:
            try:
                report = await self.db.get_final_report(interview.interview_id)
                if report and report.areas_for_improvement:
                    for weakness in report.areas_for_improvement:
                        weakness_counts[weakness] = weakness_counts.get(weakness, 0) + 1
            except Exception:
                continue
        
        # Return weaknesses that appear in at least 2 interviews
        recurring = [weakness for weakness, count in weakness_counts.items() if count >= 2]
        return recurring[:3]  # Top 3 recurring weaknesses
    
    async def _identify_consistent_strengths(self, interviews: List[Any]) -> List[str]:
        """Identify strengths that appear consistently across interviews."""
        strength_counts = {}
        
        for interview in interviews:
            try:
                report = await self.db.get_final_report(interview.interview_id)
                if report and report.key_strengths:
                    for strength in report.key_strengths:
                        strength_counts[strength] = strength_counts.get(strength, 0) + 1
            except Exception:
                continue
        
        # Return strengths that appear in at least 2 interviews
        consistent = [strength for strength, count in strength_counts.items() if count >= 2]
        return consistent[:3]  # Top 3 consistent strengths
    
    def _generate_history_based_recommendations(
        self,
        performance_pattern: Dict[str, Any],
        weaknesses: List[str],
        strengths: List[str]
    ) -> List[str]:
        """Generate recommendations based on candidate history."""
        recommendations = []
        
        if performance_pattern["trend"] == "improving":
            recommendations.append("Candidate shows improvement trend - can handle moderate challenge increase")
        elif performance_pattern["trend"] == "declining":
            recommendations.append("Candidate shows declining trend - consider supportive approach")
        
        if weaknesses:
            recommendations.append(f"Focus on recurring weaknesses: {', '.join(weaknesses[:2])}")
        
        if strengths:
            recommendations.append(f"Leverage consistent strengths: {', '.join(strengths[:2])}")
        
        if performance_pattern["consistency"] < 0.3:
            recommendations.append("Performance inconsistent - use varied question types to find optimal approach")
        
        return recommendations
    
    def _extract_requirements_from_description(self, description: str) -> List[str]:
        """Extract key requirements from job description."""
        # Simple keyword extraction (can be enhanced with NLP)
        common_requirements = [
            "programming", "algorithms", "data structures", "system design",
            "communication", "teamwork", "problem solving", "leadership",
            "testing", "debugging", "optimization", "scalability"
        ]
        
        description_lower = description.lower()
        found_requirements = [req for req in common_requirements if req in description_lower]
        
        return found_requirements
    
    async def _calculate_job_benchmarks(self, interviews: List[Any]) -> Dict[str, Dict[str, float]]:
        """Calculate performance benchmarks for a specific job."""
        benchmarks = {}
        
        # Collect scores from all interviews
        all_scores = {}
        
        for interview in interviews:
            try:
                report = await self.db.get_final_report(interview.interview_id)
                if report and report.metric_scores:
                    for metric, score in report.metric_scores.items():
                        if metric not in all_scores:
                            all_scores[metric] = []
                        all_scores[metric].append(score)
            except Exception:
                continue
        
        # Calculate statistics for each metric
        for metric, scores in all_scores.items():
            if scores:
                mean_score = sum(scores) / len(scores)
                variance = sum((score - mean_score) ** 2 for score in scores) / len(scores)
                std_dev = variance ** 0.5
                
                benchmarks[metric] = {
                    "average": mean_score,
                    "std_dev": std_dev,
                    "min": min(scores),
                    "max": max(scores),
                    "sample_size": len(scores)
                }
        
        return benchmarks
    
    async def _calculate_type_benchmarks(self, interviews: List[Any]) -> Dict[str, Dict[str, float]]:
        """Calculate benchmarks for an interview type."""
        return await self._calculate_job_benchmarks(interviews)  # Same logic
    
    async def _get_benchmark_data(self, interview_type: str, question_count: int) -> Dict[str, Dict[str, float]]:
        """Get benchmark data for comparison."""
        try:
            # Get similar interviews at same stage
            similar_interviews = await self.db.get_interviews_by_type_and_stage(
                interview_type=interview_type,
                min_questions=max(1, question_count - 2),
                max_questions=question_count + 2,
                limit=50
            )
            
            return await self._calculate_type_benchmarks(similar_interviews)
            
        except Exception as e:
            logger.error(f"Error getting benchmark data: {e}")
            # Return default benchmarks
            return {
                "technical_acumen": {"average": 65, "std_dev": 15},
                "problem_solving": {"average": 62, "std_dev": 18},
                "communication": {"average": 70, "std_dev": 12},
                "experience_relevance": {"average": 68, "std_dev": 16}
            }
    
    def _interpret_z_score(self, z_score: float) -> str:
        """Interpret z-score for performance comparison."""
        if z_score > 1.5:
            return "significantly_above_average"
        elif z_score > 0.5:
            return "above_average"
        elif z_score > -0.5:
            return "average"
        elif z_score > -1.5:
            return "below_average"
        else:
            return "significantly_below_average"
    
    def _generate_performance_recommendations(self, insights: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on performance insights."""
        recommendations = []
        
        areas_of_concern = insights.get("areas_of_concern", [])
        areas_of_strength = insights.get("areas_of_strength", [])
        
        if areas_of_concern:
            high_concern = [area for area in areas_of_concern if area["severity"] == "high"]
            if high_concern:
                recommendations.append(f"Immediate focus needed on: {', '.join([area['metric'] for area in high_concern])}")
            else:
                recommendations.append(f"Address moderate concerns in: {', '.join([area['metric'] for area in areas_of_concern])}")
        
        if areas_of_strength:
            recommendations.append(f"Leverage strengths in: {', '.join([area['metric'] for area in areas_of_strength])}")
        
        if not areas_of_concern and not areas_of_strength:
            recommendations.append("Performance is within normal range - continue standard assessment")
        
        return recommendations
    
    def _calculate_insight_confidence(
        self, 
        question_count: int, 
        metrics_count: int, 
        benchmark_data: Dict[str, Any]
    ) -> float:
        """Calculate confidence level for insights."""
        # Base confidence on amount of data
        data_confidence = min(1.0, question_count / 5)  # Full confidence at 5+ questions
        metrics_confidence = min(1.0, metrics_count / 4)  # Full confidence with 4+ metrics
        benchmark_confidence = 0.8 if benchmark_data else 0.3  # Higher if benchmarks available
        
        return (data_confidence + metrics_confidence + benchmark_confidence) / 3
    
    async def _get_successful_question_patterns(
        self, 
        interview_type: str, 
        current_performance: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """Get patterns of successful questions for this performance level."""
        # Placeholder - would analyze historical question effectiveness
        return [
            {
                "pattern": "technical_deep_dive",
                "success_rate": 0.75,
                "best_for_metrics": ["technical_acumen", "problem_solving"]
            },
            {
                "pattern": "behavioral_scenario", 
                "success_rate": 0.68,
                "best_for_metrics": ["communication", "experience_relevance"]
            }
        ]
    
    async def _analyze_topic_coverage(
        self, 
        covered_topics: List[str], 
        interview_type: str
    ) -> Dict[str, List[str]]:
        """Analyze what topics are missing for comprehensive coverage."""
        # Standard topics for interview types
        standard_topics = {
            "software_engineer": [
                "algorithms", "data_structures", "system_design", "coding_practices",
                "testing", "debugging", "optimization", "teamwork", "communication"
            ],
            "data_scientist": [
                "statistics", "machine_learning", "data_analysis", "programming",
                "visualization", "business_acumen", "communication", "ethics"
            ]
        }
        
        expected_topics = standard_topics.get(interview_type, [])
        gaps = [topic for topic in expected_topics if topic not in covered_topics]
        
        return {
            "gaps": gaps,
            "recommendations": gaps[:3]  # Top 3 recommendations
        }
    
    async def _get_difficulty_suggestions(
        self,
        current_performance: Dict[str, float],
        interview_type: str
    ) -> str:
        """Get suggestions for difficulty adjustment."""
        if not current_performance:
            return "maintain"
        
        avg_performance = sum(current_performance.values()) / len(current_performance)
        
        if avg_performance > 80:
            return "increase"  # Candidate performing well, can handle harder questions
        elif avg_performance < 50:
            return "decrease"  # Candidate struggling, easier questions might help
        else:
            return "maintain"  # Performance in normal range
    
    def _get_question_strategies(self, current_performance: Dict[str, float]) -> List[str]:
        """Get question strategies based on current performance."""
        strategies = []
        
        if not current_performance:
            return ["standard_flow"]
        
        # Find weakest area
        weakest_metric = min(current_performance.items(), key=lambda x: x[1])
        if weakest_metric[1] < 60:
            strategies.append(f"remedial_{weakest_metric[0]}")
        
        # Find strongest area
        strongest_metric = max(current_performance.items(), key=lambda x: x[1])
        if strongest_metric[1] > 80:
            strategies.append(f"advanced_{strongest_metric[0]}")
        
        strategies.append("balanced_assessment")
        return strategies