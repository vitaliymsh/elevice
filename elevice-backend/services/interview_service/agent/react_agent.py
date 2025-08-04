"""
ReAct (Reasoning + Acting) Pattern Implementation
================================================

True agent implementation using the ReAct pattern for iterative
reasoning and action-taking during interviews.
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import logging
import json

from .state import InterviewAgentState, ReActStep
from .knowledge import KnowledgeBase

logger = logging.getLogger(__name__)

class ReActAgent:
    """
    ReAct (Reasoning + Acting) pattern implementation for interview agent.
    
    This enables the agent to:
    1. Think through problems step by step
    2. Take actions based on reasoning
    3. Observe results and adjust approach
    4. Maintain a trace of its reasoning process
    """
    
    def __init__(self, llm_client, knowledge_base: KnowledgeBase):
        self.llm_client = llm_client
        self.knowledge_base = knowledge_base
        
    async def execute_react_cycle(
        self, 
        state: InterviewAgentState, 
        task: str,
        max_iterations: int = 5
    ) -> InterviewAgentState:
        """
        Execute a complete ReAct cycle for a given task.
        
        Args:
            state: Current interview agent state
            task: The task to accomplish (e.g., "generate_next_question", "evaluate_answer")
            max_iterations: Maximum reasoning iterations
            
        Returns:
            Updated state with reasoning trace and results
        """
        try:
            logger.info(f"Starting ReAct cycle for task: {task}")
            
            # Fast-path for common tasks that don't need complex reasoning
            if max_iterations <= 2:
                if task == "initialize_interview":
                    return await self._fast_initialize_interview(state)
                elif task == "evaluate_answer":
                    return await self._fast_evaluate_answer(state)
                elif task == "check_completion":
                    return await self._fast_check_completion(state)
                elif task == "generate_next_question":
                    return await self._fast_generate_question(state)
                elif task == "adapt_strategy":
                    return await self._fast_adapt_strategy(state)
            
            # Initialize reasoning cycle with safe state access
            if "current_thought" not in state:
                state["current_thought"] = None
            if "current_action" not in state:
                state["current_action"] = None
            if "current_observation" not in state:
                state["current_observation"] = None
            if "reasoning_trace" not in state:
                state["reasoning_trace"] = []
            if "tool_results" not in state:
                state["tool_results"] = {}
            
            iteration = 0
            task_completed = False
            
            while iteration < max_iterations and not task_completed:
                iteration += 1
                logger.debug(f"ReAct iteration {iteration}")
                
                try:
                    # Step 1: Reasoning (Thought)
                    thought = self._generate_thought(state, task, iteration)
                    state["current_thought"] = thought
                    
                    self._add_react_step(state, "thought", thought)
                    
                    # Step 2: Action Planning
                    action_plan = self._plan_action(state, thought, task)
                    state["current_action"] = action_plan["action"]
                    
                    self._add_react_step(state, "action", action_plan["action"], action_plan.get("tool"))
                    
                    # Step 3: Execute Action
                    observation = self._execute_action(state, action_plan)
                    state["current_observation"] = observation
                    
                    self._add_react_step(state, "observation", observation)
                    
                    # Step 4: Check if task is complete
                    task_completed = self._is_task_complete(state, task, observation)
                    
                    # Update reasoning trace
                    trace_entry = f"Iteration {iteration}: {thought[:50]}... → {action_plan['action']} → {observation[:50]}..."
                    state["reasoning_trace"].append(trace_entry)
                    
                except Exception as iteration_error:
                    logger.error(f"Error in ReAct iteration {iteration}: {iteration_error}")
                    # Try to continue with next iteration
                    observation = f"Error in iteration {iteration}: {str(iteration_error)}"
                    state["current_observation"] = observation
                    self._add_react_step(state, "observation", observation)
                    task_completed = True  # End on error
                
            # Final synthesis if task completed
            if task_completed:
                try:
                    final_result = self._synthesize_results(state, task)
                    state["tool_results"][f"{task}_result"] = final_result
                    logger.info(f"ReAct cycle completed for {task} in {iteration} iterations")
                except Exception as synthesis_error:
                    logger.error(f"Error in synthesis for {task}: {synthesis_error}")
                    state["tool_results"][f"{task}_result"] = {
                        "status": "completed_with_errors", 
                        "error": str(synthesis_error),
                        "iterations": iteration
                    }
            else:
                logger.warning(f"ReAct cycle for {task} reached max iterations without completion")
                state["tool_results"][f"{task}_result"] = {
                    "status": "incomplete", 
                    "reason": "max_iterations_reached",
                    "iterations": iteration
                }
            
            return state
            
        except Exception as e:
            logger.error(f"Critical error in ReAct cycle: {e}")
            # Ensure we don't break the state
            if "tool_results" not in state:
                state["tool_results"] = {}
            state["tool_results"][f"{task}_result"] = {"status": "error", "error": str(e)}
            return state
    
    def _generate_thought(self, state: InterviewAgentState, task: str, iteration: int) -> str:
        """Generate reasoning thought for current situation."""
        try:
            # Build context for reasoning
            context = self._build_reasoning_context(state, task)
            
            prompt = f"""
You are an intelligent interview agent using the ReAct (Reasoning + Acting) pattern.

TASK: {task}
ITERATION: {iteration}

CURRENT CONTEXT:
{context}

PREVIOUS REASONING (if any):
{chr(10).join(state.get("reasoning_trace", [])[-3:]) if state.get("reasoning_trace") else "None"}

Think step by step about the current situation:
1. What do I know about the current state?
2. What is my goal for this task?
3. What information do I need to accomplish this goal?
4. What should be my next action?

Provide your reasoning as a clear, structured thought process.
Focus on being logical, systematic, and goal-oriented.

Return only your reasoning/thought, no additional formatting.
"""
            
            response = self.llm_client.model.generate_content(prompt)
            thought = response.text.strip()
            
            return thought
            
        except Exception as e:
            logger.error(f"Error generating thought: {e}")
            return f"Error in reasoning process: {str(e)}"
    
    def _plan_action(self, state: InterviewAgentState, thought: str, task: str) -> Dict[str, Any]:
        """Plan the next action based on current thought."""
        try:
            # Available actions based on task type
            available_actions = self._get_available_actions(task)
            
            prompt = f"""
Based on your reasoning, decide on the next action to take.

THOUGHT: {thought}
TASK: {task}

AVAILABLE ACTIONS:
{chr(10).join([f"- {action}: {desc}" for action, desc in available_actions.items()])}

CURRENT STATE:
- Question Count: {state.get('question_count', 0)}/{state.get('max_questions', 10)}
- Last Action: {state.get('last_tool_used', 'None')}
- Available Tools: {state.get('available_tools', [])}

Choose the most appropriate action and provide a brief rationale.

Return your response as JSON:
{{
    "action": "action_name",
    "rationale": "why this action is appropriate",
    "tool": "tool_name_if_applicable",
    "parameters": {{"key": "value"}}
}}
"""
            
            response = self.llm_client.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            action_plan = json.loads(response.text)
            return action_plan
            
        except Exception as e:
            logger.error(f"Error planning action: {e}")
            return {
                "action": "continue_default",
                "rationale": f"Fallback due to error: {str(e)}",
                "tool": None,
                "parameters": {}
            }
    
    def _execute_action(self, state: InterviewAgentState, action_plan: Dict[str, Any]) -> str:
        """Execute the planned action and return observation."""
        try:
            action = action_plan["action"]
            tool = action_plan.get("tool")
            parameters = action_plan.get("parameters", {})
            
            logger.debug(f"Executing action: {action} with tool: {tool}")
            
            # Execute based on action type
            if action == "analyze_performance":
                return self._analyze_performance_action(state, parameters)
            
            elif action == "lookup_knowledge":
                return self._lookup_knowledge_action(state, parameters)
            
            elif action == "query_database":
                return self._query_database_action(state, parameters)
            
            elif action == "evaluate_answer":
                return self._evaluate_answer_action(state, parameters)
            
            elif action == "generate_question":
                return self._generate_question_action(state, parameters)
            
            elif action == "adjust_strategy":
                return self._adjust_strategy_action(state, parameters)
            
            elif action == "check_completion":
                return self._check_completion_action(state, parameters)
            
            else:
                return f"Unknown action: {action}. Continuing with default behavior."
                
        except Exception as e:
            logger.error(f"Error executing action {action_plan.get('action', 'unknown')}: {e}")
            return f"Action execution failed: {str(e)}"
    
    def _analyze_performance_action(self, state: InterviewAgentState, parameters: Dict[str, Any]) -> str:
        """Analyze current interview performance."""
        try:
            flat_scores = state.get("flat_scores", {})
            conversation_history = state.get("conversation_history", [])
            
            if not flat_scores:
                return "No performance data available yet. Need more interview responses to analyze."
            
            # Calculate performance insights
            avg_score = sum(flat_scores.values()) / len(flat_scores)
            weak_areas = [metric for metric, score in flat_scores.items() if score < 60]
            strong_areas = [metric for metric, score in flat_scores.items() if score > 80]
            
            # Analyze trends if multiple responses
            trend_analysis = "stable"
            if len(conversation_history) >= 2:
                recent_scores = [qa.score for qa in conversation_history[-2:] if qa.score]
                if len(recent_scores) == 2:
                    if recent_scores[1] > recent_scores[0] + 5:
                        trend_analysis = "improving"
                    elif recent_scores[1] < recent_scores[0] - 5:
                        trend_analysis = "declining"
            
            observation = f"""
Performance Analysis Complete:
- Average Score: {avg_score:.1f}/100
- Weak Areas: {weak_areas if weak_areas else 'None identified'}
- Strong Areas: {strong_areas if strong_areas else 'None yet'}
- Trend: {trend_analysis}
- Response Count: {len(conversation_history)}
"""
            
            return observation.strip()
            
        except Exception as e:
            return f"Performance analysis failed: {str(e)}"
    
    def _lookup_knowledge_action(self, state: InterviewAgentState, parameters: Dict[str, Any]) -> str:
        """Look up relevant knowledge from knowledge base."""
        try:
            lookup_type = parameters.get("type", "job_context")
            target = parameters.get("target", state.get("interview_type", "general"))
            
            if lookup_type == "job_context":
                context = self.knowledge_base.get_job_context(
                    interview_type=target,
                    job_description=state.get("job_description")
                )
                
                relevant_standards = len(context.get("industry_standards", []))
                relevant_patterns = len(context.get("technical_patterns", []))
                
                return f"Knowledge lookup complete. Found {relevant_standards} industry standards and {relevant_patterns} technical patterns for {target}."
            
            elif lookup_type == "benchmarks":
                skill_area = parameters.get("skill_area", "general")
                level = parameters.get("level", "mid")
                
                benchmarks = self.knowledge_base.get_industry_benchmarks(skill_area, level)
                criteria_count = len(benchmarks.get("expected_knowledge", []))
                
                return f"Retrieved {criteria_count} benchmark criteria for {skill_area} at {level} level."
            
            else:
                return f"Unknown knowledge lookup type: {lookup_type}"
                
        except Exception as e:
            return f"Knowledge lookup failed: {str(e)}"
    
    def _query_database_action(self, state: InterviewAgentState, parameters: Dict[str, Any]) -> str:
        """Query database for relevant information."""
        # Placeholder for database query functionality
        # In real implementation, this would use DatabaseTools
        query_type = parameters.get("type", "interview_history")
        
        if query_type == "interview_history":
            return "Database query: Found 3 previous interviews for similar role. Performance patterns available."
        elif query_type == "candidate_profile":
            return "Database query: Candidate profile indicates intermediate experience level."
        else:
            return f"Database query for {query_type} completed successfully."
    
    def _evaluate_answer_action(self, state: InterviewAgentState, parameters: Dict[str, Any]) -> str:
        """Evaluate candidate's answer."""
        conversation_history = state.get("conversation_history", [])
        
        if not conversation_history:
            return "No answers to evaluate yet."
        
        last_qa = conversation_history[-1]
        score = last_qa.score or 0
        
        return f"Answer evaluation complete. Score: {score}/100. Quality assessment: {'Good' if score > 70 else 'Needs improvement'}."
    
    def _generate_question_action(self, state: InterviewAgentState, parameters: Dict[str, Any]) -> str:
        """Generate next interview question."""
        question_type = parameters.get("type", "adaptive")
        focus_area = parameters.get("focus_area", "general")
        
        # This would interface with question generation logic
        return f"Generated {question_type} question focusing on {focus_area}. Question ready for delivery."
    
    def _adjust_strategy_action(self, state: InterviewAgentState, parameters: Dict[str, Any]) -> str:
        """Adjust interview strategy based on current performance."""
        current_strategy = state.get("interview_plan", {}).get("current_strategy", "standard")
        reason = parameters.get("reason", "performance_based")
        
        # Update strategy in state
        if "interview_plan" in state:
            state["interview_plan"]["adaptation_reason"] = reason
            state["strategy_adjustments"].append(f"Strategy adjusted: {reason}")
        
        return f"Strategy adjusted from {current_strategy} due to {reason}. New approach activated."
    
    def _check_completion_action(self, state: InterviewAgentState, parameters: Dict[str, Any]) -> str:
        """Check if interview should be completed."""
        question_count = state.get("question_count", 0)
        max_questions = state.get("max_questions", 10)
        flat_scores = state.get("flat_scores", {})
        
        if question_count >= max_questions:
            return "Completion check: Maximum questions reached. Interview should end."
        
        if flat_scores:
            avg_score = sum(flat_scores.values()) / len(flat_scores)
            if avg_score > 85 and question_count >= 5:
                return "Completion check: High performance achieved. Consider early completion."
            elif avg_score < 30 and question_count >= 5:
                return "Completion check: Low performance consistent. Consider early completion."
        
        return "Completion check: Interview should continue."
    
    def _get_available_actions(self, task: str) -> Dict[str, str]:
        """Get available actions for a specific task."""
        action_map = {
            "generate_next_question": {
                "analyze_performance": "Analyze current performance to inform question strategy",
                "lookup_knowledge": "Look up relevant knowledge and benchmarks",
                "adjust_strategy": "Adjust interview strategy based on progress",
                "generate_question": "Generate the actual next question"
            },
            "evaluate_answer": {
                "analyze_performance": "Analyze the quality of the candidate's response",
                "lookup_knowledge": "Look up evaluation criteria and benchmarks",
                "evaluate_answer": "Perform detailed answer evaluation"
            },
            "check_completion": {
                "analyze_performance": "Analyze overall interview performance",
                "check_completion": "Determine if completion criteria are met",
                "adjust_strategy": "Adjust strategy if needed before completion"
            },
            "adapt_strategy": {
                "analyze_performance": "Analyze current performance gaps",
                "lookup_knowledge": "Look up alternative approaches",
                "adjust_strategy": "Implement strategy changes"
            }
        }
        
        return action_map.get(task, {
            "analyze_performance": "Analyze current situation",
            "lookup_knowledge": "Look up relevant information",
            "continue_default": "Continue with default behavior"
        })
    
    def _is_task_complete(self, state: InterviewAgentState, task: str, observation: str) -> bool:
        """Check if the current task is complete based on observation."""
        completion_indicators = {
            "initialize_interview": ["Knowledge lookup complete", "Generated", "question ready", "interview planning", "Strategy adjusted", "complete"],
            "generate_next_question": ["Question ready", "Generated", "question focusing"],
            "evaluate_answer": ["evaluation complete", "Score:", "Quality assessment"],
            "check_completion": ["should end", "should continue", "Maximum questions", "performance"],
            "adapt_strategy": ["Strategy adjusted", "approach activated", "due to"]
        }
        
        indicators = completion_indicators.get(task, ["complete", "ready", "finished"])
        observation_lower = observation.lower()
        
        # For initialize_interview, be more lenient - complete after first meaningful action
        if task == "initialize_interview":
            basic_indicators = ["lookup", "generated", "ready", "complete", "found", "successful"]
            if any(indicator in observation_lower for indicator in basic_indicators):
                return True
        
        return any(indicator.lower() in observation_lower for indicator in indicators)
    
    def _synthesize_results(self, state: InterviewAgentState, task: str) -> Dict[str, Any]:
        """Synthesize the results of the ReAct cycle."""
        try:
            react_steps = state.get("react_steps", [])
            reasoning_trace = state.get("reasoning_trace", [])
            
            # Extract key insights from the reasoning process
            thoughts = [step.content for step in react_steps if step.step_type == "thought"]
            actions = [step.content for step in react_steps if step.step_type == "action"]
            observations = [step.content for step in react_steps if step.step_type == "observation"]
            
            synthesis = {
                "task": task,
                "status": "completed",
                "iterations": len(thoughts),
                "key_insights": thoughts[-1] if thoughts else "No insights generated",
                "final_action": actions[-1] if actions else "No actions taken",
                "final_observation": observations[-1] if observations else "No observations made",
                "reasoning_summary": self._summarize_reasoning(reasoning_trace),
                "confidence": self._calculate_confidence(observations)
            }
            
            return synthesis
            
        except Exception as e:
            logger.error(f"Error synthesizing results: {e}")
            return {
                "task": task,
                "status": "error", 
                "error": str(e)
            }
    
    def _summarize_reasoning(self, reasoning_trace: List[str]) -> str:
        """Summarize the reasoning process."""
        if not reasoning_trace:
            return "No reasoning trace available"
        
        return f"Completed {len(reasoning_trace)} reasoning iterations. Final reasoning: {reasoning_trace[-1] if reasoning_trace else 'None'}"
    
    def _calculate_confidence(self, observations: List[str]) -> float:
        """Calculate confidence score based on observations."""
        if not observations:
            return 0.5
        
        # Simple heuristic: higher confidence if observations indicate success
        success_indicators = ["complete", "successful", "ready", "generated", "found"]
        failure_indicators = ["failed", "error", "unable", "no data"]
        
        last_observation = observations[-1].lower()
        
        if any(indicator in last_observation for indicator in success_indicators):
            return 0.8
        elif any(indicator in last_observation for indicator in failure_indicators):
            return 0.3
        else:
            return 0.6
    
    def _build_reasoning_context(self, state: InterviewAgentState, task: str) -> str:
        """Build context for reasoning about the current task."""
        context_parts = []
        
        try:
            # Interview context - safe access
            context_parts.append(f"Interview Type: {state.get('interview_type', 'Unknown')}")
            context_parts.append(f"Question Count: {state.get('question_count', 0)}/{state.get('max_questions', 10)}")
            
            # Interview plan context - safe access
            interview_plan = state.get('interview_plan')
            if interview_plan:
                if hasattr(interview_plan, 'current_strategy'):
                    context_parts.append(f"Current Strategy: {interview_plan.current_strategy}")
                elif hasattr(interview_plan, 'get'):
                    context_parts.append(f"Current Strategy: {interview_plan.get('current_strategy', 'Unknown')}")
                else:
                    context_parts.append("Current Strategy: Unknown")
            else:
                context_parts.append("Current Strategy: Not initialized")
            
            # Performance context - safe access
            flat_scores = state.get("flat_scores", {})
            if flat_scores and isinstance(flat_scores, dict) and len(flat_scores) > 0:
                try:
                    avg_score = sum(flat_scores.values()) / len(flat_scores)
                    context_parts.append(f"Average Performance: {avg_score:.1f}/100")
                    context_parts.append(f"Performance Areas: {list(flat_scores.keys())}")
                except (TypeError, ZeroDivisionError):
                    context_parts.append("Performance: Data unavailable")
            else:
                context_parts.append("Performance: Not yet assessed")
            
            # Recent conversation - safe access
            conversation_history = state.get("conversation_history", [])
            if conversation_history and len(conversation_history) > 0:
                try:
                    last_qa = conversation_history[-1]
                    if hasattr(last_qa, 'question') and hasattr(last_qa, 'score'):
                        question_preview = last_qa.question[:100] if last_qa.question else "No question"
                        score = last_qa.score if last_qa.score is not None else 0
                        context_parts.append(f"Last Question: {question_preview}...")
                        context_parts.append(f"Last Answer Score: {score}/100")
                except (AttributeError, IndexError):
                    context_parts.append("Recent Conversation: Data unavailable")
            else:
                context_parts.append("Recent Conversation: None yet")
            
        except Exception as e:
            logger.error(f"Error building reasoning context: {e}")
            context_parts.append(f"Context Error: {str(e)}")
        
        return "\n".join(context_parts)
    
    def _add_react_step(self, state: InterviewAgentState, step_type: str, content: str, tool_used: Optional[str] = None):
        """Add a step to the ReAct trace."""
        try:
            step = ReActStep(
                step_type=step_type,
                content=content,
                timestamp=datetime.now().isoformat(),
                tool_used=tool_used,
                result=None  # Can be populated later if needed
            )
            
            if "react_steps" not in state:
                state["react_steps"] = []
            
            state["react_steps"].append(step)
        except Exception as e:
            logger.error(f"Error adding ReAct step: {e}")
            # Ensure react_steps exists even if step creation fails
            if "react_steps" not in state:
                state["react_steps"] = []
    
    async def _fast_initialize_interview(self, state: InterviewAgentState) -> InterviewAgentState:
        """Fast initialization path that skips complex ReAct reasoning."""
        try:
            logger.info("Using fast initialization path")
            
            # Initialize required state fields
            if "reasoning_trace" not in state:
                state["reasoning_trace"] = []
            if "tool_results" not in state:
                state["tool_results"] = {}
            if "react_steps" not in state:
                state["react_steps"] = []
            
            # Simple, direct initialization logic
            thought = f"Starting {state.get('interview_type', 'general')} interview initialization. Need to set up interview context and generate opening question."
            action = "lookup_knowledge"
            observation = self._lookup_knowledge_action(state, {"type": "job_context", "target": state.get("interview_type", "general")})
            
            # Add steps to trace
            self._add_react_step(state, "thought", thought)
            self._add_react_step(state, "action", action)
            self._add_react_step(state, "observation", observation)
            
            # Mark as completed with fast synthesis
            state["tool_results"]["initialize_interview_result"] = {
                "status": "completed",
                "method": "fast_path",
                "iterations": 1,
                "key_insights": thought,
                "final_action": action,
                "final_observation": observation,
                "confidence": 0.8
            }
            
            state["reasoning_trace"].append(f"Fast initialization: {thought[:100]}... → {action} → Success")
            
            logger.info("Fast initialization completed successfully")
            return state
            
        except Exception as e:
            logger.error(f"Error in fast initialization: {e}")
            # Fall back to regular ReAct cycle
            state["tool_results"]["initialize_interview_result"] = {
                "status": "error", 
                "error": str(e),
                "fallback_needed": True
            }
            return state
    
    async def _fast_evaluate_answer(self, state: InterviewAgentState) -> InterviewAgentState:
        """Fast answer evaluation path."""
        try:
            logger.info("Using fast answer evaluation path")
            
            # Initialize required state fields
            if "reasoning_trace" not in state:
                state["reasoning_trace"] = []
            if "tool_results" not in state:
                state["tool_results"] = {}
            if "react_steps" not in state:
                state["react_steps"] = []
            
            # Get the answer to evaluate
            answer = state.get("_current_answer", "")
            if not answer:
                # No answer to evaluate
                thought = "No candidate answer provided to evaluate."
                action = "continue_default"
                observation = "Evaluation skipped - no answer available."
            else:
                # Simple evaluation logic
                thought = f"Evaluating candidate answer: '{answer[:50]}...'. Assessing quality and relevance."
                action = "evaluate_answer"
                
                # Basic scoring (this could be enhanced with actual LLM evaluation)
                word_count = len(answer.split())
                if word_count < 5:
                    score = 30
                    quality = "Very brief response"
                elif word_count < 20:
                    score = 50
                    quality = "Brief but adequate"
                elif word_count < 50:
                    score = 70
                    quality = "Good detail level"
                else:
                    score = 80
                    quality = "Comprehensive response"
                
                observation = f"Answer evaluation complete. Score: {score}/100. Quality: {quality}. Word count: {word_count}."
            
            # Add steps to trace
            self._add_react_step(state, "thought", thought)
            self._add_react_step(state, "action", action)
            self._add_react_step(state, "observation", observation)
            
            # Mark as completed
            state["tool_results"]["evaluate_answer_result"] = {
                "status": "completed",
                "method": "fast_path",
                "iterations": 1,
                "key_insights": thought,
                "final_action": action,
                "final_observation": observation,
                "confidence": 0.7
            }
            
            state["reasoning_trace"].append(f"Fast evaluation: {thought[:50]}... → {action} → Complete")
            
            logger.info("Fast answer evaluation completed successfully")
            return state
            
        except Exception as e:
            logger.error(f"Error in fast evaluation: {e}")
            state["tool_results"]["evaluate_answer_result"] = {"status": "error", "error": str(e)}
            return state
    
    async def _fast_check_completion(self, state: InterviewAgentState) -> InterviewAgentState:
        """Fast completion check path."""
        try:
            logger.info("Using fast completion check path")
            
            # Initialize required state fields
            if "reasoning_trace" not in state:
                state["reasoning_trace"] = []
            if "tool_results" not in state:
                state["tool_results"] = {}
            if "react_steps" not in state:
                state["react_steps"] = []
            
            # Simple completion logic
            question_count = state.get("question_count", 0) or 0
            max_questions = state.get("max_questions", 10) or 10
            
            thought = f"Checking completion criteria. Current: {question_count}/{max_questions} questions."
            action = "check_completion"
            
            if question_count >= max_questions:
                observation = "Completion check: Maximum questions reached. Interview should end."
                should_complete = True
            else:
                observation = "Completion check: Interview should continue."
                should_complete = False
            
            # Add steps to trace
            self._add_react_step(state, "thought", thought)
            self._add_react_step(state, "action", action)
            self._add_react_step(state, "observation", observation)
            
            # Mark as completed
            state["tool_results"]["check_completion_result"] = {
                "status": "completed",
                "method": "fast_path",
                "iterations": 1,
                "key_insights": thought,
                "final_action": action,
                "final_observation": observation,
                "should_complete": should_complete,
                "confidence": 0.9
            }
            
            state["reasoning_trace"].append(f"Fast completion check: {thought} → {observation}")
            
            logger.info("Fast completion check completed successfully")
            return state
            
        except Exception as e:
            logger.error(f"Error in fast completion check: {e}")
            state["tool_results"]["check_completion_result"] = {"status": "error", "error": str(e)}
            return state
    
    async def _fast_generate_question(self, state: InterviewAgentState) -> InterviewAgentState:
        """Fast question generation path."""
        try:
            logger.info("Using fast question generation path")
            
            # Initialize required state fields
            if "reasoning_trace" not in state:
                state["reasoning_trace"] = []
            if "tool_results" not in state:
                state["tool_results"] = {}
            if "react_steps" not in state:
                state["react_steps"] = []
            
            # Simple question generation logic
            interview_type = state.get("interview_type", "general")
            question_count = state.get("question_count", 0) or 0
            
            thought = f"Generating next question for {interview_type} interview. This will be question #{question_count + 1}."
            action = "generate_question"
            observation = f"Generated {interview_type} question focusing on general experience. Question ready for delivery."
            
            # Add steps to trace
            self._add_react_step(state, "thought", thought)
            self._add_react_step(state, "action", action)
            self._add_react_step(state, "observation", observation)
            
            # Mark as completed
            state["tool_results"]["generate_next_question_result"] = {
                "status": "completed",
                "method": "fast_path", 
                "iterations": 1,
                "key_insights": thought,
                "final_action": action,
                "final_observation": observation,
                "generated_question": f"Can you tell me about a challenging {interview_type.lower()} project you've worked on?",
                "confidence": 0.7
            }
            
            state["reasoning_trace"].append(f"Fast question generation: {thought} → Question ready")
            
            logger.info("Fast question generation completed successfully")
            return state
            
        except Exception as e:
            logger.error(f"Error in fast question generation: {e}")
            state["tool_results"]["generate_next_question_result"] = {"status": "error", "error": str(e)}
            return state
    
    async def _fast_adapt_strategy(self, state: InterviewAgentState) -> InterviewAgentState:
        """Fast strategy adaptation path."""
        try:
            logger.info("Using fast strategy adaptation path")
            
            # Initialize required state fields
            if "reasoning_trace" not in state:
                state["reasoning_trace"] = []
            if "tool_results" not in state:
                state["tool_results"] = {}
            if "react_steps" not in state:
                state["react_steps"] = []
            
            # Simple strategy adaptation logic
            current_strategy = state.get("interview_plan", {}).get("current_strategy", "standard")
            flat_scores = state.get("flat_scores", {})
            
            thought = f"Evaluating current strategy '{current_strategy}' based on performance data."
            action = "adjust_strategy"
            
            # Simple strategy logic
            if flat_scores:
                avg_score = sum(flat_scores.values()) / len(flat_scores)
                if avg_score > 80:
                    new_strategy = "advanced_probing"
                    reason = "High performance - increasing difficulty"
                elif avg_score < 50:
                    new_strategy = "supportive_guidance"
                    reason = "Lower performance - providing more support"
                else:
                    new_strategy = current_strategy
                    reason = "Performance stable - maintaining current approach"
            else:
                new_strategy = current_strategy
                reason = "No performance data yet - maintaining current approach"
            
            observation = f"Strategy analysis complete. {reason}. Strategy: {new_strategy}."
            
            # Add steps to trace
            self._add_react_step(state, "thought", thought)
            self._add_react_step(state, "action", action)
            self._add_react_step(state, "observation", observation)
            
            # Mark as completed
            state["tool_results"]["adapt_strategy_result"] = {
                "status": "completed",
                "method": "fast_path",
                "iterations": 1,
                "key_insights": thought,
                "final_action": action,
                "final_observation": observation,
                "new_strategy": new_strategy,
                "reason": reason,
                "confidence": 0.8
            }
            
            state["reasoning_trace"].append(f"Fast strategy adaptation: {reason}")
            
            logger.info("Fast strategy adaptation completed successfully")
            return state
            
        except Exception as e:
            logger.error(f"Error in fast strategy adaptation: {e}")
            state["tool_results"]["adapt_strategy_result"] = {"status": "error", "error": str(e)}
            return state