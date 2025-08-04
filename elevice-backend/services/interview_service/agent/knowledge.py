"""
Knowledge Base System
====================

Job-specific knowledge base with industry standards and benchmarks.
Provides contextual information to enhance interview questions and evaluation.
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json
import logging

logger = logging.getLogger(__name__)

@dataclass
class IndustryStandard:
    """Represents an industry standard or benchmark."""
    name: str
    description: str
    skill_level: str  # junior, mid, senior
    assessment_criteria: List[str]
    example_questions: List[str]
    red_flags: List[str]

@dataclass
class TechnicalPattern:
    """Common technical pattern or best practice."""
    pattern_name: str
    description: str
    use_cases: List[str]
    interview_focus: List[str]
    depth_levels: Dict[str, List[str]]  # junior/mid/senior expectations

class KnowledgeBase:
    """
    Comprehensive knowledge base for interview enhancement.
    
    Provides job-specific knowledge, industry standards, and benchmarks
    to make the agent more intelligent and contextually aware.
    """
    
    def __init__(self):
        self.industry_standards = self._load_industry_standards()
        self.technical_patterns = self._load_technical_patterns()
        self.job_templates = self._load_job_templates()
        self.assessment_frameworks = self._load_assessment_frameworks()
        
    def get_job_context(self, interview_type: str, job_description: Optional[str] = None) -> Dict[str, Any]:
        """
        Get comprehensive context for a specific job type.
        
        Args:
            interview_type: Type of interview (e.g., "Software Engineer", "Data Scientist")
            job_description: Optional specific job description
            
        Returns:
            Comprehensive context including standards, patterns, and assessment criteria
        """
        try:
            # Normalize interview type
            normalized_type = self._normalize_job_type(interview_type)
            
            context = {
                "job_type": normalized_type,
                "industry_standards": self._get_standards_for_job(normalized_type),
                "technical_patterns": self._get_patterns_for_job(normalized_type),
                "assessment_framework": self._get_assessment_framework(normalized_type),
                "skill_progression": self._get_skill_progression(normalized_type),
                "common_weaknesses": self._get_common_weaknesses(normalized_type),
                "question_templates": self._get_question_templates(normalized_type)
            }
            
            # Enhance with job description analysis if provided
            if job_description:
                context.update(self._analyze_job_description(job_description, normalized_type))
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting job context: {e}")
            return self._get_fallback_context(interview_type)
    
    def get_industry_benchmarks(self, skill_area: str, experience_level: str) -> Dict[str, Any]:
        """Get industry benchmarks for specific skill area and experience level."""
        try:
            benchmarks = {
                "expected_knowledge": [],
                "assessment_criteria": [],
                "difficulty_indicators": {},
                "progression_path": []
            }
            
            if skill_area in self.industry_standards:
                standards = self.industry_standards[skill_area]
                level_standards = [s for s in standards if s.skill_level.lower() == experience_level.lower()]
                
                for standard in level_standards:
                    benchmarks["expected_knowledge"].extend(standard.assessment_criteria)
                    benchmarks["assessment_criteria"].extend(standard.example_questions)
            
            return benchmarks
            
        except Exception as e:
            logger.error(f"Error getting industry benchmarks: {e}")
            return {"expected_knowledge": [], "assessment_criteria": []}
    
    def get_adaptive_question_context(
        self, 
        current_performance: Dict[str, float],
        covered_topics: List[str],
        target_metric: str
    ) -> Dict[str, Any]:
        """
        Get context for adaptive question generation based on current performance.
        
        This enables dynamic planning and strategy adjustment.
        """
        try:
            context = {
                "focus_areas": [],
                "difficulty_adjustment": "maintain",
                "suggested_topics": [],
                "assessment_strategy": "standard",
                "follow_up_areas": []
            }
            
            # Analyze performance gaps
            weak_areas = [metric for metric, score in current_performance.items() if score < 60]
            strong_areas = [metric for metric, score in current_performance.items() if score > 80]
            
            if weak_areas:
                context["focus_areas"] = weak_areas
                context["difficulty_adjustment"] = "simplify"
                context["assessment_strategy"] = "remedial"
                
            if strong_areas and len(weak_areas) == 0:
                context["difficulty_adjustment"] = "increase"
                context["assessment_strategy"] = "advanced"
            
            # Get suggested topics for target metric
            if target_metric in self.technical_patterns:
                patterns = self.technical_patterns[target_metric]
                uncovered_topics = [p.pattern_name for p in patterns if p.pattern_name not in covered_topics]
                context["suggested_topics"] = uncovered_topics[:3]  # Top 3 suggestions
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting adaptive question context: {e}")
            return {"focus_areas": [], "difficulty_adjustment": "maintain"}
    
    def _load_industry_standards(self) -> Dict[str, List[IndustryStandard]]:
        """Load industry standards and benchmarks."""
        return {
            "software_engineering": [
                IndustryStandard(
                    name="Data Structures & Algorithms",
                    description="Fundamental CS concepts",
                    skill_level="junior",
                    assessment_criteria=[
                        "Can implement basic data structures (arrays, lists, hashmaps)",
                        "Understands time/space complexity basics",
                        "Can solve simple algorithmic problems"
                    ],
                    example_questions=[
                        "Implement a hash table with collision handling",
                        "Explain the difference between O(n) and O(log n)",
                        "How would you find duplicates in an array?"
                    ],
                    red_flags=[
                        "Cannot explain basic Big O notation",
                        "Struggles with simple array operations",
                        "No understanding of data structure trade-offs"
                    ]
                ),
                IndustryStandard(
                    name="System Design Principles",
                    description="Designing scalable systems",
                    skill_level="senior",
                    assessment_criteria=[
                        "Can design distributed systems",
                        "Understands scalability patterns",
                        "Considers reliability and fault tolerance"
                    ],
                    example_questions=[
                        "Design a URL shortening service like bit.ly",
                        "How would you handle 1 million concurrent users?",
                        "Explain microservices vs monolith trade-offs"
                    ],
                    red_flags=[
                        "Cannot think beyond single-machine solutions",
                        "No consideration of failure scenarios",
                        "Lacks understanding of distributed system concepts"
                    ]
                )
            ],
            "data_science": [
                IndustryStandard(
                    name="Statistical Analysis",
                    description="Statistical thinking and methods",
                    skill_level="mid",
                    assessment_criteria=[
                        "Understands hypothesis testing",
                        "Can interpret statistical significance",
                        "Knows when to use different statistical tests"
                    ],
                    example_questions=[
                        "How would you determine if a new feature improved user engagement?",
                        "Explain the difference between correlation and causation",
                        "When would you use a t-test vs chi-square test?"
                    ],
                    red_flags=[
                        "Cannot explain p-values",
                        "Assumes correlation implies causation",
                        "No understanding of statistical power"
                    ]
                )
            ]
        }
    
    def _load_technical_patterns(self) -> Dict[str, List[TechnicalPattern]]:
        """Load common technical patterns for different domains."""
        return {
            "problem_solving": [
                TechnicalPattern(
                    pattern_name="Divide and Conquer",
                    description="Breaking complex problems into smaller subproblems",
                    use_cases=["Algorithm design", "System architecture", "Debugging"],
                    interview_focus=["Problem decomposition", "Recursive thinking", "Optimization"],
                    depth_levels={
                        "junior": ["Can break down simple problems", "Understands recursion basics"],
                        "mid": ["Applies divide-and-conquer to medium complexity problems", "Optimizes recursive solutions"],
                        "senior": ["Designs complex solutions using D&C", "Teaches pattern to others"]
                    }
                ),
                TechnicalPattern(
                    pattern_name="Pattern Recognition",
                    description="Identifying similar problems and applying known solutions",
                    use_cases=["Code reuse", "Architecture decisions", "Problem solving"],
                    interview_focus=["Previous experience application", "Learning from examples"],
                    depth_levels={
                        "junior": ["Recognizes basic patterns in code"],
                        "mid": ["Applies patterns from previous projects"],
                        "senior": ["Creates new patterns and abstractions"]
                    }
                )
            ],
            "technical_acumen": [
                TechnicalPattern(
                    pattern_name="Code Quality Practices",
                    description="Writing maintainable, readable, testable code",
                    use_cases=["Code reviews", "Refactoring", "Team collaboration"],
                    interview_focus=["Clean code principles", "Testing strategies", "Documentation"],
                    depth_levels={
                        "junior": ["Writes readable code", "Understands basic testing"],
                        "mid": ["Applies SOLID principles", "Writes comprehensive tests"],
                        "senior": ["Defines coding standards", "Mentors others on best practices"]
                    }
                )
            ]
        }
    
    def _load_job_templates(self) -> Dict[str, Dict[str, Any]]:
        """Load job-specific templates and requirements."""
        return {
            "software_engineer": {
                "core_skills": ["Programming", "Data Structures", "Algorithms", "System Design"],
                "behavioral_focus": ["Problem Solving", "Team Collaboration", "Learning Agility"],
                "experience_indicators": {
                    "junior": ["Basic programming", "Simple problem solving", "Willingness to learn"],
                    "mid": ["Complex problem solving", "System integration", "Code review experience"],
                    "senior": ["Architecture decisions", "Team leadership", "Mentoring others"]
                }
            },
            "data_scientist": {
                "core_skills": ["Statistics", "Machine Learning", "Data Analysis", "Programming"],
                "behavioral_focus": ["Analytical Thinking", "Communication", "Business Acumen"],
                "experience_indicators": {
                    "junior": ["Basic statistics", "Tool familiarity", "Data cleaning"],
                    "mid": ["Model building", "Feature engineering", "Results interpretation"],
                    "senior": ["Experiment design", "Strategic insights", "Cross-functional leadership"]
                }
            }
        }
    
    def _load_assessment_frameworks(self) -> Dict[str, Dict[str, Any]]:
        """Load assessment frameworks for different job types."""
        return {
            "software_engineer": {
                "evaluation_dimensions": [
                    "Technical Knowledge",
                    "Problem Solving Approach", 
                    "Code Quality",
                    "System Thinking",
                    "Communication",
                    "Learning Ability"
                ],
                "scoring_rubric": {
                    "excellent": "Exceeds expectations, demonstrates deep understanding",
                    "good": "Meets expectations, solid understanding with minor gaps",
                    "adequate": "Basic understanding, needs development in some areas",
                    "poor": "Below expectations, significant gaps in knowledge"
                }
            }
        }
    
    def _normalize_job_type(self, interview_type: str) -> str:
        """Normalize job type to standard categories."""
        type_mapping = {
            "software engineer": "software_engineer",
            "software developer": "software_engineer", 
            "backend developer": "software_engineer",
            "frontend developer": "software_engineer",
            "full stack developer": "software_engineer",
            "data scientist": "data_scientist",
            "ml engineer": "data_scientist",
            "data analyst": "data_scientist"
        }
        
        normalized = interview_type.lower().strip()
        return type_mapping.get(normalized, "software_engineer")  # Default fallback
    
    def _get_standards_for_job(self, job_type: str) -> List[IndustryStandard]:
        """Get industry standards for specific job type."""
        return self.industry_standards.get(job_type, [])
    
    def _get_patterns_for_job(self, job_type: str) -> List[TechnicalPattern]:
        """Get technical patterns relevant to job type."""
        # Return patterns from all relevant categories
        relevant_patterns = []
        for category, patterns in self.technical_patterns.items():
            relevant_patterns.extend(patterns)
        return relevant_patterns
    
    def _get_assessment_framework(self, job_type: str) -> Dict[str, Any]:
        """Get assessment framework for job type."""
        return self.assessment_frameworks.get(job_type, {})
    
    def _get_skill_progression(self, job_type: str) -> Dict[str, List[str]]:
        """Get skill progression expectations for job type."""
        job_template = self.job_templates.get(job_type, {})
        return job_template.get("experience_indicators", {})
    
    def _get_common_weaknesses(self, job_type: str) -> List[str]:
        """Get common weaknesses for job type to focus assessment."""
        weakness_map = {
            "software_engineer": [
                "Lack of system design thinking",
                "Poor code organization",
                "Insufficient testing mindset",
                "Limited scalability consideration"
            ],
            "data_scientist": [
                "Statistical misunderstanding",
                "Poor data intuition", 
                "Lack of business context",
                "Overfitting tendencies"
            ]
        }
        return weakness_map.get(job_type, [])
    
    def _get_question_templates(self, job_type: str) -> Dict[str, List[str]]:
        """Get question templates for job type."""
        return {
            "technical_deep_dive": [
                "Walk me through how you would implement...",
                "What are the trade-offs between X and Y approaches?",
                "How would you optimize this for scale?"
            ],
            "behavioral": [
                "Tell me about a time when you had to...",
                "How do you approach learning new technologies?",
                "Describe a challenging problem you solved recently"
            ],
            "problem_solving": [
                "Given this scenario, how would you approach it?",
                "What questions would you ask to better understand...?",
                "Walk me through your thought process for..."
            ]
        }
    
    def _analyze_job_description(self, job_description: str, job_type: str) -> Dict[str, Any]:
        """Analyze specific job description to extract requirements."""
        # Simple keyword-based analysis (can be enhanced with NLP)
        keywords = {
            "languages": ["python", "java", "javascript", "c++", "go", "rust"],
            "frameworks": ["react", "angular", "django", "flask", "spring", "express"],
            "databases": ["sql", "mongodb", "redis", "postgresql", "mysql"],
            "cloud": ["aws", "azure", "gcp", "kubernetes", "docker"],
            "methodologies": ["agile", "scrum", "tdd", "ci/cd", "devops"]
        }
        
        description_lower = job_description.lower()
        found_technologies = {}
        
        for category, tech_list in keywords.items():
            found_technologies[category] = [tech for tech in tech_list if tech in description_lower]
        
        return {
            "specific_technologies": found_technologies,
            "emphasis_areas": self._extract_emphasis_areas(job_description),
            "experience_requirements": self._extract_experience_level(job_description)
        }
    
    def _extract_emphasis_areas(self, job_description: str) -> List[str]:
        """Extract key emphasis areas from job description."""
        emphasis_keywords = {
            "leadership": ["lead", "mentor", "manage", "guide", "architect"],
            "innovation": ["innovative", "creative", "cutting-edge", "research"],
            "collaboration": ["team", "collaborate", "cross-functional", "stakeholder"],
            "performance": ["scalable", "optimiz", "performance", "efficient"],
            "quality": ["test", "quality", "reliable", "maintainable"]
        }
        
        description_lower = job_description.lower()
        emphasis_areas = []
        
        for area, keywords in emphasis_keywords.items():
            if any(keyword in description_lower for keyword in keywords):
                emphasis_areas.append(area)
        
        return emphasis_areas
    
    def _extract_experience_level(self, job_description: str) -> str:
        """Extract experience level from job description."""
        description_lower = job_description.lower()
        
        if any(term in description_lower for term in ["senior", "lead", "principal", "staff"]):
            return "senior"
        elif any(term in description_lower for term in ["junior", "entry", "associate", "new grad"]):
            return "junior"
        else:
            return "mid"
    
    def _get_fallback_context(self, interview_type: str) -> Dict[str, Any]:
        """Fallback context when specific job type not found."""
        return {
            "job_type": interview_type,
            "industry_standards": [],
            "technical_patterns": [],
            "assessment_framework": {},
            "skill_progression": {},
            "common_weaknesses": ["Limited experience", "Communication gaps"],
            "question_templates": {
                "general": ["Tell me about your background", "What interests you about this role?"]
            }
        }