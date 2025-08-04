import os
import google.generativeai as genai
from typing import List
import logging
import json

logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set.")

        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    # Legacy method (for backward compatibility)
    def generate_questions(self, role: str, description: str, questions_amount: int):
        """Generate multiple questions for a role (legacy method)."""
        prompt = f"""
        Generate {questions_amount} interview questions for a {role} position.
        {"Job description: " + description if description else ""}
        Return the questions as a JSON list of strings.
        """

        try:
            response = self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return response.text
        except Exception as e:
            logger.error(f"Error in legacy question generation: {e}")
            return f"An error occurred: {e}"

    def generate_first_question(self, interview_type: str, job_description: str = None):
        """Generate the opening question for a new interview."""
        prompt = f"""
        You are an experienced technical interviewer conducting a {interview_type} interview.
        
        {"Context: " + job_description if job_description else ""}
        
        Generate an appropriate opening question that:
        1. Sets a welcoming and professional tone
        2. Is relevant to the {interview_type} role
        3. Allows the candidate to introduce themselves and their experience
        4. Is open-ended to encourage detailed responses
        
        Return your response as JSON in this format:
        {{"question": "Your opening question here"}}
        """

        try:
            response = self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return response.text
        except Exception as e:
            logger.error(f"Error generating first question: {e}")
            return f'{{"question": "Tell me about yourself and your experience relevant to this {interview_type} position."}}'

    def generate_contextual_question(self, conversation_history: List, interview_type: str, job_description: str = None):
        """Generate the next question based on conversation history (RAG approach)."""
        
        # Build conversation context
        conversation_context = self._build_conversation_context(conversation_history)
        
        prompt = f"""
        You are an experienced technical interviewer conducting a {interview_type} interview.
        
        {"Job Description: " + job_description if job_description else ""}
        
        CONVERSATION HISTORY:
        {conversation_context}
        
        Based on the conversation history above, generate the next interview question that:
        
        1. BUILDS ON PREVIOUS ANSWERS: Reference or follow up on specific points the candidate mentioned
        2. AVOIDS REPETITION: Don't ask about topics already covered thoroughly
        3. IDENTIFIES GAPS: Explore areas not yet discussed that are important for the role
        4. ADAPTS DIFFICULTY: Adjust complexity based on the candidate's demonstrated knowledge level
        5. MAINTAINS FLOW: Ensure the question feels natural and connected to the conversation
        6. EXPLORES DEPTH: If previous answers were surface-level, dig deeper into technical details
        
        ANALYSIS GUIDELINES:
        - If the candidate showed strength in an area, explore related advanced topics
        - If the candidate struggled, either provide easier follow-ups or move to different areas
        - Look for opportunities to ask behavioral questions based on technical claims
        - Consider asking for specific examples or implementation details
        
        Return your response as JSON in this format:
        {{"question": "Your contextual follow-up question here"}}
        
        The question should feel like a natural continuation of an intelligent conversation, not a random question from a list.
        """

        try:
            response = self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return response.text
        except Exception as e:
            logger.error(f"Error generating contextual question: {e}")
            return f'{{"question": "Can you tell me more about your experience with {interview_type} technologies?"}}'

    def _build_conversation_context(self, conversation_history: List) -> str:
        """Build a formatted string representation of the conversation history."""
        if not conversation_history:
            return "No previous conversation."
        
        context_parts = []
        for i, item in enumerate(conversation_history, 1):
            # Handle both ConversationItem objects and dictionaries
            if hasattr(item, 'question'):
                # ConversationItem object - use attribute access
                question = item.question
                answer = item.answer
            else:
                # Dictionary - use get method
                question = item.get('question', 'N/A')
                answer = item.get('answer', 'N/A')
                
            context_parts.append(f"Q{i}: {question}")
            context_parts.append(f"A{i}: {answer}")
            context_parts.append("")  # Empty line for readability
        
        return "\n".join(context_parts)

    def generate_automated_answer(self, question: str, interview_type: str, conversation_history: List = None, candidate_profile: str = None, difficulty_level: str = "intermediate"):
        """Generate an automated answer to an interview question as if from a candidate."""
        
        # Build conversation context if available
        conversation_context = ""
        if conversation_history:
            conversation_context = f"\n\nCONVERSATION HISTORY:\n{self._build_conversation_context(conversation_history)}"
        
        # Build candidate profile context
        profile_context = ""
        if candidate_profile:
            profile_context = f"\n\nCANDIDATE PROFILE:\n{candidate_profile}"
        
        # Determine experience level prompting
        experience_levels = {
            "junior": "1-2 years of experience, learning fundamentals, some gaps in knowledge",
            "intermediate": "3-5 years of experience, solid fundamentals, good practical knowledge",
            "senior": "5+ years of experience, deep expertise, leadership experience, architectural thinking"
        }
        
        experience_description = experience_levels.get(difficulty_level, experience_levels["intermediate"])
        
        prompt = f"""
        You are simulating a {difficulty_level} level candidate being interviewed for a {interview_type} position.
        
        CANDIDATE EXPERIENCE LEVEL: {experience_description}
        
        QUESTION TO ANSWER:
        "{question}"
        {conversation_context}
        {profile_context}
        
        Generate a realistic answer that a {difficulty_level} level candidate would give. The answer should:
        
        FOR {difficulty_level.upper()} LEVEL:
        """
        
        if difficulty_level == "junior":
            prompt += """
        - Show enthusiasm and willingness to learn
        - Demonstrate basic knowledge but admit when unsure
        - Ask clarifying questions when appropriate
        - Show some nervousness but genuine interest
        - Reference coursework, tutorials, or simple projects
        - Be honest about limitations while showing growth mindset
        """
        elif difficulty_level == "senior":
            prompt += """
        - Demonstrate deep technical knowledge and experience
        - Provide specific examples from real projects and challenges
        - Show architectural thinking and system design understanding
        - Discuss trade-offs and decision-making processes
        - Mention leadership, mentoring, or team collaboration experiences
        - Reference industry best practices and emerging technologies
        """
        else:  # intermediate
            prompt += """
        - Show solid understanding of core concepts
        - Provide practical examples from work experience
        - Demonstrate problem-solving approach
        - Show some specialization but acknowledge areas for growth
        - Balance confidence with humility
        - Reference real projects and technologies used
        """
        
        prompt += f"""
        
        ANSWER GUIDELINES:
        - Keep answers conversational and natural (2-4 sentences typically)
        - Stay in character for the experience level
        - Be consistent with any previous answers in the conversation
        - Show personality and communication style appropriate for the level
        - Include technical details appropriate for the {interview_type} role
        - Make the answer feel authentic and human
        
        Return your response as JSON in this format, only single JSON object:
        {{
            "answer": "Your simulated candidate answer here",
            "reasoning": "Brief explanation of the answer approach and why it fits the experience level"
        }}
        """
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return response.text
        except Exception as e:
            logger.error(f"Error generating automated answer: {e}")
            # Fallback response based on difficulty level
            fallback_answers = {
                "junior": "I'm still learning about this area, but from what I understand so far... I'd love to learn more about the specific approaches your team uses.",
                "intermediate": "Based on my experience, I would approach this by... I've used similar techniques in previous projects with good results.",
                "senior": "This is an interesting challenge. In my experience leading similar projects, I've found that the key considerations are... Let me walk you through how I've solved this before."
            }
            
            fallback_answer = fallback_answers.get(difficulty_level, fallback_answers["intermediate"])
            
            return json.dumps({
                "answer": fallback_answer,
                "reasoning": f"Fallback response for {difficulty_level} level candidate due to generation error."
            })
