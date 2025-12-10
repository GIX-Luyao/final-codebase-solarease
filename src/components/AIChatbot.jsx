import React, { useState, useRef, useEffect } from 'react';
import './AIChatbot.css';

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Soli, your solar energy assistant. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const recommendedQuestions = [
    "What's the ROI for solar in my area?",
    "How do community solar projects work?",
    "What incentives are available?"
  ];

  async function sendMessage(messageText = input) {
    if (!messageText.trim() || isLoading) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      });

      const data = await response.json();
      
      if (data.result) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.result }]);
      } else {
        throw new Error('No response from AI');
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      <button 
        className={`chatbot-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="AI Assistant"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <img src="/images/c03a5d5b44f31db9f4e39e43af3eade3a9d213c9.png" alt="AI" style={{ width: '32px', height: '32px' }} />
        )}
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="5" fill="#FDB813" stroke="#FDB813" strokeWidth="2"/>
                <line x1="12" y1="1" x2="12" y2="4" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="20" x2="12" y2="23" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
                <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
                <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
                <line x1="1" y1="12" x2="4" y2="12" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
                <line x1="20" y1="12" x2="23" y2="12" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
                <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
                <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="#FDB813" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="chatbot-header-text">
              <h3>AI Assistant <span className="soli-name">Soli</span></h3>
              <p>Hi! I'm Soli, your solar energy assistant. How can I help you today?</p>
            </div>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>

          <div className="chatbot-messages" ref={chatContainerRef}>
            {messages.slice(1).map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="message-avatar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="4" fill="#FDB813" stroke="#FDB813" strokeWidth="1.5"/>
                      <line x1="12" y1="2" x2="12" y2="4" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="12" y1="20" x2="12" y2="22" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="5" y1="5" x2="6.5" y2="6.5" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="17.5" y1="17.5" x2="19" y2="19" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="2" y1="12" x2="4" y2="12" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="20" y1="12" x2="22" y2="12" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="5" y1="19" x2="6.5" y2="17.5" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="17.5" y1="6.5" x2="19" y2="5" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="4" fill="#FDB813" stroke="#FDB813" strokeWidth="1.5"/>
                    <line x1="12" y1="2" x2="12" y2="4" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="12" y1="20" x2="12" y2="22" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="5" y1="5" x2="6.5" y2="6.5" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="17.5" y1="17.5" x2="19" y2="19" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="2" y1="12" x2="4" y2="12" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="20" y1="12" x2="22" y2="12" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="5" y1="19" x2="6.5" y2="17.5" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="17.5" y1="6.5" x2="19" y2="5" stroke="#FDB813" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="message-content typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="recommended-questions">
              <div className="rec-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="#0DA2E7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Recommended Questions
              </div>
              {recommendedQuestions.map((q, i) => (
                <button
                  key={i}
                  className="rec-question"
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input-area">
            <input
              type="text"
              className="chatbot-input"
              placeholder="Ask me anything about solar..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <button 
              className="chatbot-send"
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
