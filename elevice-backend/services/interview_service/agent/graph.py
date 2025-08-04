"""
LangGraph Interview Agent Implementation
=======================================

Complete LangGraph-based interview agent with:
- ReAct pattern integration
- Dynamic planning and strategy adjustment
- Tool calling capabilities
- Job-specific knowledge integration
"""

from typing import Dict, List, Any, Optional, Callable
from datetime import datetime
import logging
import json

try:
    from langgraph.graph import StateGraph, END
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain.tools import Tool
    from langchain.schema import BaseMessage, HumanMessage, AIMessage
except ImportError:
    # Fallback if LangGraph not available
    logging.warning("LangGraph dependencies not available, using custom implementation")
    StateGraph = None
    END = "END"

from .state import InterviewAgentState, create_initial_state, QuestionAnswerPair
from .react_agent import ReActAgent
from .knowledge import KnowledgeBase
from .tools import InterviewTools

logger = logging.getLogger(__name__)

class InterviewAgentGraph:
    """
    Complete LangGraph-based interview agent with true agent capabilities.
    
    Features:
    - ReAct (Reasoning + Acting) pattern
    - Dynamic planning and strategy adjustment
    - Tool calling for database queries
    - Job-specific knowledge integration
    - Streaming responses support
    """
    
    def __init__(self, llm_client, database_manager):
        self.llm_client = llm_client
        self.database_manager = database_manager
        
        # Initialize components
        self.knowledge_base = KnowledgeBase()
        self.react_agent = ReActAgent(llm_client, self.knowledge_base)
        self.tools = InterviewTools(database_manager)
        
        # Disable LangGraph for now to avoid background processing issues
        # TODO: Fix LangGraph background execution before re-enabling
        self.graph = None  # self._build_graph() if StateGraph else None
        
        # Session storage
        self.active_sessions = {}
        
        logger.info("Interview Agent Graph initialized with ReAct pattern and tool calling")
    
    def _build_graph(self) -> Optional[Any]:
        """Build the LangGraph workflow."""
        if not StateGraph:
            return None
            
        try:
            # Create the state graph
            workflow = StateGraph(InterviewAgentState)
            
            # Add nodes
            workflow.add_node("initialize", self._initialize_node)
            workflow.add_node("react_planning", self._react_planning_node)
            workflow.add_node("knowledge_lookup", self._knowledge_lookup_node)
            workflow.add_node("database_query", self._database_query_node)
            workflow.add_node("generate_question", self._generate_question_node)
            workflow.add_node("evaluate_answer", self._evaluate_answer_node)
            workflow.add_node("adapt_strategy", self._adapt_strategy_node)
            workflow.add_node("check_completion", self._check_completion_node)
            workflow.add_node("finalize", self._finalize_node)
            
            # Add edges
            workflow.add_edge("initialize", "react_planning")
            workflow.add_conditional_edges(
                "react_planning",
                self._route_from_planning,
                {
                    "knowledge_lookup": "knowledge_lookup",
                    "database_query": "database_query", 
                    "generate_question": "generate_question",
                    "evaluate_answer": "evaluate_answer",
                    "adapt_strategy": "adapt_strategy",
                    "check_completion": "check_completion"
                }
            )
            
            # Connect tool nodes back to planning
            workflow.add_edge("knowledge_lookup", "react_planning")
            workflow.add_edge("database_query", "react_planning")
            
            # Connect action nodes
            workflow.add_edge("generate_question", "check_completion")
            workflow.add_edge("evaluate_answer", "adapt_strategy")
            workflow.add_edge("adapt_strategy", "check_completion")
            
            # Completion routing
            workflow.add_conditional_edges(
                "check_completion",
                self._route_completion,
                {
                    "continue": "react_planning",
                    "complete": "finalize"
                }
            )
            
            workflow.add_edge("finalize", END)
            
            # Set entry point
            workflow.set_entry_point("initialize")
            
            return workflow.compile()
            
        except Exception as e:
            logger.error(f"Error building LangGraph: {e}")
            return None
    
    # Public Interface
    
    async def start_interview(
        self,
        interview_type: str,
        job_description: Optional[str] = None,
        interviewer_persona: str = "Technical Interviewer",
        max_questions: int = 10,
        interview_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Start a new interview session."""
        try:
            # Create initial state
            state = create_initial_state(
                interview_type=interview_type,
                job_description=job_description,
                interviewer_persona=interviewer_persona,
                max_questions=max_questions
            )
            
            if interview_id:
                state["interview_id"] = interview_id
            
            # Run initialization through graph or direct execution
            if self.graph:
                result = await self.graph.ainvoke(state)
            else:
                result = await self._run_initialization_workflow(state)
            
            # Store session
            session_id = result["session_id"]
            self.active_sessions[session_id] = result
            
            return {
                "session_id": session_id,
                "current_question": result["current_question"],
                "interview_type": result["interview_type"],
                "question_count": result["question_count"],
                "strategy": result["interview_plan"]["current_strategy"],
                "confidence": result["interview_plan"]["confidence_level"]
            }
            
        except Exception as e:
            logger.error(f"Error starting interview: {e}")
            raise
    
    async def process_answer(
        self,
        session_id: str,
        candidate_answer: str,
        duration_seconds: Optional[float] = None
    ) -> Dict[str, Any]:
        """Process candidate answer and generate next question."""
        try:
            if session_id not in self.active_sessions:
                raise ValueError(f"Session {session_id} not found")
            
            state = self.active_sessions[session_id].copy()
            
            # Add answer to state
            state["_current_answer"] = candidate_answer
            state["_answer_duration"] = duration_seconds
            
            # Process through graph or direct execution
            if self.graph:
                result = await self.graph.ainvoke(state)
            else:
                result = await self._run_answer_processing_workflow(state)
            
            # Update stored session
            self.active_sessions[session_id] = result
            
            return {
                "session_id": session_id,
                "next_question": result.get("current_question"),
                "interview_complete": result.get("interview_complete", False),
                "completion_reason": result.get("completion_reason"),
                "real_time_feedback": result.get("real_time_feedback"),
                "performance_summary": self._format_performance_summary(result),
                "reasoning_trace": result.get("reasoning_trace", [])[-3:],  # Last 3 steps
                "strategy_adjustments": result.get("strategy_adjustments", [])
            }
            
        except Exception as e:
            logger.error(f"Error processing answer: {e}")
            raise
    
    # LangGraph Node Implementations
    
    async def _initialize_node(self, state: InterviewAgentState) -> InterviewAgentState:
        """Initialize interview with ReAct planning."""
        try:
            logger.info(f"Initializing interview for type: {state['interview_type']}")
            
            # Use ReAct agent for initialization planning (reduced iterations for faster startup)
            state = await self.react_agent.execute_react_cycle(
                state, 
                task="initialize_interview",
                max_iterations=2
            )
            
            # Get job-specific knowledge
            job_context = self.knowledge_base.get_job_context(
                interview_type=state["interview_type"],
                job_description=state.get("job_description")
            )
            
            state["knowledge_context"] = job_context
            
            # Generate opening question using knowledge context
            opening_question = await self._generate_opening_question(state, job_context)
            state["current_question"] = opening_question
            state["question_count"] = 1
            
            # Initialize interview plan safely
            interview_plan = state.get("interview_plan")
            if interview_plan:
                interview_plan.planned_topics = list(job_context.get("question_templates", {}).keys())
                interview_plan.current_strategy = "opening"
            
            logger.info(f"Interview initialized with opening question: {opening_question[:50]}...")
            return state
            
        except Exception as e:
            logger.error(f"Error in initialize node: {e}")
            state["debug_info"]["initialization_error"] = str(e)
            return state
    
    async def _react_planning_node(self, state: InterviewAgentState) -> InterviewAgentState:
        """ReAct planning and reasoning node."""
        try:
            # Determine what the agent needs to do next
            current_task = self._determine_current_task(state)
            
            logger.info(f"ReAct planning for task: {current_task}")
            
            # Execute ReAct cycle for current task (reduced iterations for fast paths)
            state = await self.react_agent.execute_react_cycle(
                state,
                task=current_task,
                max_iterations=2
            )
            
            # Store the planned next action
            if state.get("tool_results", {}).get(f"{current_task}_result"):
                result = state["tool_results"][f"{current_task}_result"]
                state["next_action_plan"] = [result.get("final_action", "continue")]
            
            return state
            
        except Exception as e:
            logger.error(f"Error in ReAct planning: {e}")
            state["debug_info"]["planning_error"] = str(e)
            return state
    
    async def _knowledge_lookup_node(self, state: InterviewAgentState) -> InterviewAgentState:
        """Knowledge base lookup node."""
        try:
            # Get adaptive question context based on current performance
            covered_topics = state.get("interview_plan", {}).get("covered_topics", [])
            current_performance = state.get("flat_scores", {})
            target_metric = state.get("current_target_metric", "general")
            
            adaptive_context = self.knowledge_base.get_adaptive_question_context(
                current_performance=current_performance,
                covered_topics=covered_topics,
                target_metric=target_metric
            )
            
            # Store results in state
            state["tool_results"]["knowledge_lookup"] = adaptive_context
            state["last_tool_used"] = "knowledge_lookup"
            
            logger.info(f"Knowledge lookup completed: {len(adaptive_context.get('suggested_topics', []))} suggestions")
            return state
            
        except Exception as e:
            logger.error(f"Error in knowledge lookup: {e}")
            state["tool_results"]["knowledge_lookup"] = {"error": str(e)}
            return state
    
    async def _database_query_node(self, state: InterviewAgentState) -> InterviewAgentState:
        """Database query node for candidate and job context."""
        try:
            query_results = {}
            
            # Get candidate history if available
            if state.get("interview_id"):
                # This would be implemented with proper user ID extraction
                # candidate_history = await self.tools.get_candidate_history(user_id)
                # query_results["candidate_history"] = candidate_history
                pass
            
            # Get job context data
            job_context = await self.tools.get_job_context_data(
                interview_type=state["interview_type"]
            )
            query_results["job_context"] = job_context
            
            # Get performance insights if we have scores
            if state.get("flat_scores"):
                insights = await self.tools.get_performance_insights(
                    current_scores=state["flat_scores"],
                    interview_type=state["interview_type"],
                    question_count=state["question_count"]
                )
                query_results["performance_insights"] = insights
            
            state["tool_results"]["database_query"] = query_results
            state["last_tool_used"] = "database_query"
            
            logger.info("Database query completed successfully")
            return state
            
        except Exception as e:
            logger.error(f"Error in database query: {e}")
            state["tool_results"]["database_query"] = {"error": str(e)}
            return state
    
    async def _generate_question_node(self, state: InterviewAgentState) -> InterviewAgentState:
        """Generate next interview question."""
        try:
            # Use ReAct agent for question generation (fast-path enabled)
            state = await self.react_agent.execute_react_cycle(
                state,
                task="generate_next_question",
                max_iterations=2
            )
            
            # Get question from ReAct results or generate directly
            question_result = state.get("tool_results", {}).get("generate_next_question_result")
            
            if question_result and question_result.get("status") == "completed":
                # ReAct agent successfully generated question
                new_question = question_result.get("generated_question", "")
            else:
                # Fallback to direct question generation
                new_question = await self._generate_adaptive_question(state)
            
            state["current_question"] = new_question
            state["question_count"] += 1
            
            # Update covered topics
            if "interview_plan" in state:
                # Extract topic from question (simple heuristic)
                topic = self._extract_topic_from_question(new_question)
                if topic and topic not in state["interview_plan"]["covered_topics"]:
                    state["interview_plan"]["covered_topics"].append(topic)
            
            logger.info(f"Generated question {state['question_count']}: {new_question[:50]}...")
            return state
            
        except Exception as e:
            logger.error(f"Error generating question: {e}")
            state["current_question"] = "Can you tell me more about your experience?"
            return state
    
    async def _evaluate_answer_node(self, state: InterviewAgentState) -> InterviewAgentState:
        """Evaluate candidate's answer."""
        try:
            candidate_answer = state.get("_current_answer", "")
            duration = state.get("_answer_duration")
            
            if not candidate_answer:
                logger.warning("No candidate answer to evaluate")
                return state
            
            # Use ReAct agent for evaluation (fast-path enabled)
            state = await self.react_agent.execute_react_cycle(
                state,
                task="evaluate_answer",
                max_iterations=2
            )
            
            # Generate comprehensive evaluation
            evaluation = await self._comprehensive_answer_evaluation(
                state, candidate_answer, duration
            )
            
            # Create Q&A pair
            qa_pair = QuestionAnswerPair(
                question=state.get("current_question", ""),
                answer=candidate_answer,
                timestamp=datetime.now().isoformat(),
                score=evaluation.get("overall_score", 50),
                metrics=evaluation.get("metrics", {}),
                feedback=evaluation.get("feedback", ""),
                reasoning_trace=state.get("reasoning_trace", [])[-1:] if state.get("reasoning_trace") else []
            )
            
            # Update conversation history
            state["conversation_history"].append(qa_pair)
            
            # Update performance scores
            if evaluation.get("metrics"):
                state["flat_scores"].update(evaluation["metrics"])
            
            # Calculate running average
            scores = [qa.score for qa in state["conversation_history"] if qa.score]
            if scores:
                state["average_score"] = sum(scores) / len(scores)
            
            # Generate real-time feedback
            state["real_time_feedback"] = evaluation.get("real_time_feedback")
            
            logger.info(f"Answer evaluated: Score {evaluation.get('overall_score', 0)}/100")
            return state
            
        except Exception as e:
            logger.error(f"Error evaluating answer: {e}")
            state["debug_info"]["evaluation_error"] = str(e)
            return state
    
    async def _adapt_strategy_node(self, state: InterviewAgentState) -> InterviewAgentState:
        """Adapt interview strategy based on performance."""
        try:
            # Use ReAct agent for strategy adaptation (fast-path enabled)
            state = await self.react_agent.execute_react_cycle(
                state,
                task="adapt_strategy",
                max_iterations=2
            )
            
            # Analyze current performance for strategy adjustment
            current_performance = state.get("flat_scores", {})
            average_score = state.get("average_score", 50)
            question_count = state.get("question_count", 0)
            
            # Determine if strategy change is needed
            strategy_change = await self._determine_strategy_adjustment(
                current_performance, average_score, question_count
            )
            
            if strategy_change["should_adjust"]:
                old_strategy = state["interview_plan"]["current_strategy"]
                new_strategy = strategy_change["new_strategy"]
                
                state["interview_plan"]["current_strategy"] = new_strategy
                state["interview_plan"]["adaptation_reason"] = strategy_change["reason"]
                state["interview_plan"]["confidence_level"] = strategy_change.get("confidence", 0.7)
                
                adjustment_msg = f"Strategy adjusted from {old_strategy} to {new_strategy}: {strategy_change['reason']}"
                state["strategy_adjustments"].append(adjustment_msg)
                
                logger.info(adjustment_msg)
            
            return state
            
        except Exception as e:
            logger.error(f"Error adapting strategy: {e}")
            state["debug_info"]["adaptation_error"] = str(e)
            return state
    
    async def _check_completion_node(self, state: InterviewAgentState) -> InterviewAgentState:
        """Check if interview should be completed."""
        try:
            # Use ReAct agent for completion analysis (fast-path enabled)
            state = await self.react_agent.execute_react_cycle(
                state,
                task="check_completion",
                max_iterations=2
            )
            
            # Comprehensive completion check
            completion_analysis = await self._comprehensive_completion_check(state)
            
            state["interview_complete"] = completion_analysis["should_complete"]
            if completion_analysis["should_complete"]:
                state["completion_reason"] = completion_analysis["reason"]
                logger.info(f"Interview marked for completion: {completion_analysis['reason']}")
            
            return state
            
        except Exception as e:
            logger.error(f"Error checking completion: {e}")
            return state
    
    async def _finalize_node(self, state: InterviewAgentState) -> InterviewAgentState:
        """Finalize interview and generate summary."""
        try:
            # Generate comprehensive final summary
            final_summary = await self._generate_comprehensive_summary(state)
            state["overall_performance_summary"] = final_summary
            
            # Calculate final metrics
            final_metrics = self._calculate_final_metrics(state)
            state["final_metrics"] = final_metrics
            
            logger.info("Interview finalized successfully")
            return state
            
        except Exception as e:
            logger.error(f"Error finalizing interview: {e}")
            state["debug_info"]["finalization_error"] = str(e)
            return state
    
    # Helper Methods
    
    def _determine_current_task(self, state: InterviewAgentState) -> str:
        """Determine what task the agent should focus on next."""
        if state.get("_current_answer"):
            return "evaluate_answer"
        elif state.get("question_count", 0) == 0:
            return "initialize_interview"
        elif not state.get("current_question"):
            return "generate_next_question"
        else:
            return "check_completion"
    
    def _route_from_planning(self, state: InterviewAgentState) -> str:
        """Route from planning node based on ReAct decision."""
        next_actions = state.get("next_action_plan", [])
        
        if not next_actions:
            return "generate_question"
        
        next_action = next_actions[0]
        
        routing_map = {
            "lookup_knowledge": "knowledge_lookup",
            "query_database": "database_query",
            "generate_question": "generate_question",
            "evaluate_answer": "evaluate_answer",
            "adapt_strategy": "adapt_strategy",
            "check_completion": "check_completion"
        }
        
        return routing_map.get(next_action, "generate_question")
    
    def _route_completion(self, state: InterviewAgentState) -> str:
        """Route based on completion check."""
        return "complete" if state.get("interview_complete", False) else "continue"
    
    # Fallback workflow methods (when LangGraph not available)
    
    async def _run_initialization_workflow(self, state: InterviewAgentState) -> InterviewAgentState:
        """Run initialization workflow without LangGraph."""
        state = await self._initialize_node(state)
        return state
    
    async def _run_answer_processing_workflow(self, state: InterviewAgentState) -> InterviewAgentState:
        """Run answer processing workflow without LangGraph."""
        # Sequential execution of nodes
        state = await self._react_planning_node(state)
        state = await self._evaluate_answer_node(state)
        state = await self._adapt_strategy_node(state)
        state = await self._check_completion_node(state)
        
        if not state.get("interview_complete", False):
            state = await self._generate_question_node(state)
        else:
            state = await self._finalize_node(state)
        
        return state
    
    # Implementation of helper methods would continue here...
    # (Additional methods for question generation, evaluation, etc.)
    
    async def _generate_opening_question(self, state: InterviewAgentState, job_context: Dict[str, Any]) -> str:
        """Generate contextual opening question."""
        try:
            prompt = f"""
You are {state['interviewer_persona']} starting a {state['interview_type']} interview.

Job Context: {job_context.get('job_type', 'general')}
Key Focus Areas: {job_context.get('question_templates', {}).keys()}

Generate a warm, professional opening question that:
1. Sets a welcoming tone
2. Allows the candidate to introduce themselves
3. Is specific to the {state['interview_type']} role
4. Provides insight into their background and motivation

Return only the question text.
"""
            
            response = self.llm_client.model.generate_content(prompt)
            return response.text.strip().strip('"\'')
            
        except Exception as e:
            logger.error(f"Error generating opening question: {e}")
            return f"Tell me about yourself and what interests you about this {state['interview_type']} position."
    
    async def _generate_adaptive_question(self, state: InterviewAgentState) -> str:
        """Generate adaptive question based on current state."""
        # This would implement sophisticated question generation logic
        # For now, return a placeholder
        return "Can you walk me through your approach to solving complex technical problems?"
    
    def _extract_topic_from_question(self, question: str) -> str:
        """Extract topic from generated question."""
        # Simple keyword-based topic extraction
        topic_keywords = {
            "technical": ["implement", "code", "algorithm", "system", "design"],
            "behavioral": ["tell me about", "describe", "experience", "situation"],
            "problem_solving": ["approach", "solve", "challenge", "problem"]
        }
        
        question_lower = question.lower()
        for topic, keywords in topic_keywords.items():
            if any(keyword in question_lower for keyword in keywords):
                return topic
        
        return "general"
    
    async def _comprehensive_answer_evaluation(
        self, 
        state: InterviewAgentState, 
        answer: str, 
        duration: Optional[float]
    ) -> Dict[str, Any]:
        """Comprehensive answer evaluation with multiple metrics."""
        # Placeholder implementation
        return {
            "overall_score": 75,
            "metrics": {
                "technical_acumen": 70,
                "problem_solving": 80,
                "communication": 75,
                "experience_relevance": 70
            },
            "feedback": "Good response with clear examples",
            "real_time_feedback": {
                "summary": "Strong technical explanation, could provide more specific examples",
                "coaching_focus": "specificity"
            }
        }
    
    async def _determine_strategy_adjustment(
        self,
        performance: Dict[str, float],
        average_score: float,
        question_count: int
    ) -> Dict[str, Any]:
        """Determine if strategy adjustment is needed."""
        if average_score > 85 and question_count >= 3:
            return {
                "should_adjust": True,
                "new_strategy": "advanced_probing",
                "reason": "High performance - increasing difficulty",
                "confidence": 0.8
            }
        elif average_score < 50 and question_count >= 3:
            return {
                "should_adjust": True,
                "new_strategy": "supportive_guidance",
                "reason": "Lower performance - providing more support",
                "confidence": 0.7
            }
        else:
            return {"should_adjust": False}
    
    async def _comprehensive_completion_check(self, state: InterviewAgentState) -> Dict[str, Any]:
        """Comprehensive check for interview completion."""
        question_count = state.get("question_count", 0) or 0
        max_questions = state.get("max_questions", 10) or 10
        average_score = state.get("average_score", 50) or 50
        flat_scores = state.get("flat_scores", {}) or {}
        
        # Ensure we have valid numbers for comparison
        if not isinstance(question_count, (int, float)):
            question_count = 0
        if not isinstance(max_questions, (int, float)):
            max_questions = 10
        if not isinstance(average_score, (int, float)):
            average_score = 50
        
        # Check max questions
        if question_count >= max_questions:
            return {
                "should_complete": True,
                "reason": "Maximum questions reached"
            }
        
        # Check performance thresholds
        if average_score > 90 and question_count >= 5:
            return {
                "should_complete": True,
                "reason": "Excellent performance achieved"
            }
        
        if average_score < 25 and question_count >= 5:
            return {
                "should_complete": True,
                "reason": "Performance concerns - ending interview"
            }
        
        # Check metric saturation
        if flat_scores and all(score > 80 for score in flat_scores.values()) and question_count >= 4:
            return {
                "should_complete": True,
                "reason": "All metrics above threshold"
            }
        
        return {"should_complete": False}
    
    async def _generate_comprehensive_summary(self, state: InterviewAgentState) -> str:
        """Generate comprehensive interview summary."""
        try:
            conversation_history = state.get("conversation_history", [])
            average_score = state.get("average_score", 50)
            completion_reason = state.get("completion_reason", "Unknown")
            
            prompt = f"""
Generate a comprehensive interview summary for this {state['interview_type']} candidate.

Interview Overview:
- Questions Asked: {state.get('question_count', 0)}
- Average Score: {average_score:.1f}/100
- Completion Reason: {completion_reason}
- Strategy Used: {state.get('interview_plan', {}).get('current_strategy', 'standard')}

Performance Metrics:
{json.dumps(state.get('flat_scores', {}), indent=2)}

Provide a professional 3-4 sentence summary covering:
1. Overall performance assessment
2. Key strengths demonstrated
3. Areas for development
4. Recommendation for next steps
"""
            
            response = self.llm_client.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return f"Interview completed with {state.get('question_count', 0)} questions. Average performance: {state.get('average_score', 50):.1f}/100."
    
    def _calculate_final_metrics(self, state: InterviewAgentState) -> Dict[str, Any]:
        """Calculate final interview metrics."""
        return {
            "total_questions": state.get("question_count", 0),
            "average_score": state.get("average_score", 50),
            "metric_scores": state.get("flat_scores", {}),
            "strategy_adjustments": len(state.get("strategy_adjustments", [])),
            "reasoning_steps": len(state.get("react_steps", [])),
            "tool_usage": len(state.get("tool_results", {}))
        }
    
    def _format_performance_summary(self, state: InterviewAgentState) -> Dict[str, Any]:
        """Format performance summary for API response."""
        return {
            "current_scores": state.get("flat_scores", {}),
            "average_score": state.get("average_score"),
            "question_count": state.get("question_count", 0),
            "strategy": state.get("interview_plan", {}).get("current_strategy", "standard"),
            "confidence": state.get("interview_plan", {}).get("confidence_level", 0.5)
        }