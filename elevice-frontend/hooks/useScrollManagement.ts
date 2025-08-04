import { useState, useRef, useEffect } from "react"
import { type ConversationItem } from "@/types/interview"

export const useScrollManagement = (conversation: ConversationItem[], deps: any[] = []) => {
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const scrollToBottom = () => {
    // Find the scrollable container (parent of the ref element)
    const scrollableContainer = transcriptContainerRef.current?.closest('.overflow-y-auto');
    if (scrollableContainer) {
      scrollableContainer.scrollTo({
        top: scrollableContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive or content changes
    const scrollableContainer = transcriptContainerRef.current?.closest('.overflow-y-auto');
    if (scrollableContainer) {
      const isScrolledToBottom =
        scrollableContainer.scrollHeight - scrollableContainer.clientHeight <= scrollableContainer.scrollTop + 10;
      
      // Always auto-scroll for new messages unless user has manually scrolled up significantly
      const shouldAutoScroll = conversation.length === 0 || conversation.length === 1 || 
        (scrollableContainer.scrollHeight - scrollableContainer.clientHeight <= scrollableContainer.scrollTop + 100);
      
      if (shouldAutoScroll || conversation.some(item => item.isPlaceholder)) {
        // Auto scroll for first message, new messages, or when there are placeholder messages being updated
        setTimeout(() => {
          scrollableContainer.scrollTo({
            top: scrollableContainer.scrollHeight,
            behavior: 'smooth'
          });
        }, 50); // Reduced timeout for more responsive scrolling
      }
      
      // Update scroll to bottom button visibility
      const shouldShowButton = scrollableContainer.scrollHeight > scrollableContainer.clientHeight && !isScrolledToBottom;
      setShowScrollToBottom(shouldShowButton);
    }
  }, [conversation, ...deps]);

  useEffect(() => {
    const scrollableContainer = transcriptContainerRef.current?.closest('.overflow-y-auto');
    if (scrollableContainer) {
      const handleScroll = () => {
        const isAtBottom = scrollableContainer.scrollHeight - scrollableContainer.clientHeight <= scrollableContainer.scrollTop + 10;
        const shouldShowButton = scrollableContainer.scrollHeight > scrollableContainer.clientHeight && !isAtBottom;
        setShowScrollToBottom(shouldShowButton);
      };
      
      scrollableContainer.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
      
      return () => scrollableContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return { transcriptContainerRef, showScrollToBottom, scrollToBottom };
};
