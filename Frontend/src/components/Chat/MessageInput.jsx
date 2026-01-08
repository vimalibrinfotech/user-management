import { useState, useRef, useEffect } from 'react';

const MessageInput = ({ onSendMessage, onTyping, onStopTyping }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    // Auto-resize textarea based on content
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Typing indicator logic
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      console.log('🔵 Emitting typing:start');
      onTyping();
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onStopTyping();
    }, 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        onStopTyping();
      }

      // Clear timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-white border-t border-gray-300 p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows="1"
          className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </form>
      <p className="text-xs text-gray-500 mt-2">
        Press Enter to send, Shift + Enter for new line
      </p>
    </div>
  );
};

export default MessageInput;