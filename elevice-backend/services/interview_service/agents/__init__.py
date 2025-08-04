"""
Agent Implementations Package
=============================

This package contains wrapper implementations that adapt different
agent types to the unified InterviewAgentInterface.
"""

from .langchain_agent_wrapper import LangChainAgentWrapper
from .true_agent_wrapper import TrueAgentWrapper

__all__ = [
    'LangChainAgentWrapper',
    'TrueAgentWrapper'
]