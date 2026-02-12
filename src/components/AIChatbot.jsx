import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './AIChatbot.css';
import SolarAIAgent from '../lib/SolarAIAgent';
import AIPersonalizationPanel from './AIPersonalizationPanel';
import AIEvaluationPanel from './AIEvaluationPanel';
import UsabilityTestRunner from './UsabilityTestRunner';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function AIChatbot() {
  const { isAuthenticated, authFetch } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [aiAgent] = useState(() => new SolarAIAgent());
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Soli, your personalized solar energy agent. I'll learn your preferences as we chat and help you make the best solar decisions for your situation. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [insights, setInsights] = useState([]);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [showUsabilityTest, setShowUsabilityTest] = useState(false);
  const [userContracts, setUserContracts] = useState([]);
  const [roiCalculationsCount, setRoiCalculationsCount] = useState(0);
  const [contractsLoaded, setContractsLoaded] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: false, source: 'unknown' });
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Get personalized greeting based on user profile
  function getPersonalizedGreeting() {
    const profile = aiAgent?.userProfile;
    if (!profile || profile.interactions === 0) {
      if (isAuthenticated) {
        return "Hi! I'm Soli, your personalized solar energy agent. I have access to your saved contract analyses and can answer specific questions about your contract terms, pricing, and risk flags. How can I help you today?";
      }
      return "Hi! I'm Soli, your personalized solar energy agent. I'll learn your preferences as we chat and help you make the best solar decisions for your situation. Sign in to let me access your saved contracts for personalized advice!";
    } else if (profile.name) {
      return `Welcome back, ${profile.name}! ${isAuthenticated && userContracts.length > 0 ? `I can access your ${userContracts.length} saved contract${userContracts.length > 1 ? 's' : ''} with full details.` : 'I remember our previous conversations.'} What would you like to explore today?`;
    } else {
      return `Good to see you again! ${isAuthenticated ? "I have access to your contract analyses and can provide specific insights." : "Sign in to let me access your contract details."} What's on your mind?`;
    }
  }

  // Load user contracts and ROI calculations from database
  const loadUserContracts = async () => {
    // Only load data if user is authenticated
    if (!isAuthenticated) {
      setContractsLoaded(true);
      return;
    }

    try {
      // Load contracts
      const contractsResponse = await authFetch(`${API_URL}/api/contracts`);
      const contractsData = await contractsResponse.json();

      if (contractsResponse.ok && contractsData.contracts) {
        setUserContracts(contractsData.contracts);

        // Update AI agent with contract context
        if (aiAgent && typeof aiAgent.updateUserContracts === 'function') {
          aiAgent.updateUserContracts(contractsData.contracts);
        }
      }
    } catch (err) {
      console.log('Contract database not available, continuing without contract integration');
      setUserContracts([]);
    }

    try {
      // Load ROI calculations count
      const roiResponse = await authFetch(`${API_URL}/api/roi-calculations`);
      const roiData = await roiResponse.json();

      if (roiResponse.ok && roiData.calculations) {
        setRoiCalculationsCount(roiData.calculations.length);
      }
    } catch (err) {
      console.log('ROI calculations not available');
      setRoiCalculationsCount(0);
    }

    setContractsLoaded(true);
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const [recommendedQuestions, setRecommendedQuestions] = useState([]);

  // Update recommended questions based on user profile
  useEffect(() => {
    // Load contracts when component mounts
    if (!contractsLoaded && aiAgent) {
      loadUserContracts();
    }

    if (aiAgent) {
      try {
        const personalizedQuestions = aiAgent.getPersonalizedSuggestions();
        setRecommendedQuestions(personalizedQuestions);
        
        // Get proactive insights
        const proactiveInsights = aiAgent.getProactiveInsights();
        setInsights(proactiveInsights);
      } catch (err) {
        console.log('Error loading AI suggestions:', err);
      }
    }
    
    // Listen for context updates from other components
    const handleContextUpdate = () => {
      if (aiAgent) {
        try {
          const newInsights = aiAgent.getProactiveInsights();
          setInsights(newInsights);
          const newQuestions = aiAgent.getPersonalizedSuggestions();
          setRecommendedQuestions(newQuestions);
        } catch (err) {
          console.log('Error updating context:', err);
        }
      }
    };

    // Listen for open AI assistant event from home page feature card
    const handleOpenAIAssistant = () => {
      setIsOpen(true);
    };

    window.addEventListener('roiDataUpdated', handleContextUpdate);
    window.addEventListener('negotiationCompleted', handleContextUpdate);
    window.addEventListener('openAIAssistant', handleOpenAIAssistant);

    return () => {
      window.removeEventListener('roiDataUpdated', handleContextUpdate);
      window.removeEventListener('negotiationCompleted', handleContextUpdate);
      window.removeEventListener('openAIAssistant', handleOpenAIAssistant);
    };
  }, [aiAgent, contractsLoaded]);

  async function sendMessage(messageText = input) {
    if (!messageText.trim() || isLoading) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let data;

      // If authenticated, use the endpoint that includes full contract analysis
      if (isAuthenticated) {
        // Build conversation history for context
        const conversationHistory = messages.map(m => ({
          role: m.role,
          content: m.content
        }));

        const response = await authFetch(`${API_URL}/api/chat-with-contracts`, {
          method: 'POST',
          body: JSON.stringify({
            message: messageText,
            conversationHistory
          })
        });

        data = await response.json();

        // Update contract count if returned
        if (data.contractCount !== undefined) {
          setUserContracts(prev => {
            // Just update the count indicator, actual contracts loaded separately
            if (prev.length !== data.contractCount) {
              return Array(data.contractCount).fill({ filename: 'contract' });
            }
            return prev;
          });
        }

        // Update ROI calculations count if returned
        if (data.roiCalculationCount !== undefined) {
          setRoiCalculationsCount(data.roiCalculationCount);
        }
      } else {
        // Fallback for unauthenticated users - basic chat without contract details
        let systemPrompt = `You are Soli, an intelligent solar energy agent. `;

        // Add basic contract context if available (just filenames)
        if (userContracts.length > 0) {
          const contractSummary = userContracts.map(c =>
            `"${c.filename}" (uploaded ${new Date(c.created_at).toLocaleDateString()})`
          ).join(', ');
          systemPrompt += `The user has uploaded ${userContracts.length} contract(s): ${contractSummary}. `;
        }

        systemPrompt += `Be helpful, specific, and informative about solar energy topics.`;

        const response = await fetch(`${API_URL}/api/ai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: systemPrompt + "\n\nUser message: " + messageText,
            context: 'general_chat'
          })
        });

        data = await response.json();
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.result || "I'm here to help with your solar journey! What would you like to know?"
      }]);

    } catch (err) {
      console.error('Chat Error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Let me try to help in another way - would you like me to show you our ROI calculator?'
      }]);
    } finally {
      setIsLoading(false);
    }
  }
  
  // Handle suggestion clicks
  function handleSuggestionClick(suggestion) {
    if (suggestion.includes('ROI') || suggestion.includes('Calculate') || suggestion.includes('Negotiation')) {
      // Navigate to ROI calculator (includes Nash bargaining)
      window.location.href = '/roi-calculator';
    } else if (suggestion.includes('contract') || suggestion.includes('Analyze my')) {
      // Handle contract analysis requests
      if (userContracts.length > 0) {
        const contractDetails = userContracts.map(c => `"${c.filename}" (${new Date(c.created_at).toLocaleDateString()})`).join(', ');
        sendMessage(`Please analyze my uploaded contracts: ${contractDetails}. What are the key terms and how do they compare to market rates?`);
      } else {
        sendMessage('I don\'t see any uploaded contracts yet. Can you help me understand what to look for in solar contracts?');
      }
    } else {
      // Send as message
      sendMessage(suggestion);
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
        onClick={() => {
          if (!isOpen) {
            // Update AI agent context when opening
            const currentPath = window.location.pathname;
            const contextData = {};
            
            // Detect current page context
            if (currentPath.includes('roi-simulator') || currentPath.includes('roi-calculator')) {
              contextData.currentPage = 'roi-calculator';
              // Try to get ROI data from URL or localStorage
              const params = new URLSearchParams(window.location.search);
              if (params.get('location')) {
                contextData.location = params.get('location');
              }
            }
            
            aiAgent.updateContext(contextData);
          }
          setIsOpen(!isOpen);
        }}
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
              <p>Your personalized solar energy agent</p>

              {isAuthenticated && (userContracts.length > 0 || roiCalculationsCount > 0) && (
                <div className="data-access-badges">
                  {userContracts.length > 0 && (
                    <div className="contract-access-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="14,2 14,8 20,8" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{userContracts.length} contract{userContracts.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {roiCalculationsCount > 0 && (
                    <div className="contract-access-badge roi-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="12" y1="1" x2="12" y2="23" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{roiCalculationsCount} ROI calc{roiCalculationsCount > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              )}

              {aiAgent.userProfile.interactions > 0 && (
                <div className="user-stats">
                  <span className="interaction-count">{aiAgent.userProfile.interactions} interactions</span>
                  {aiAgent.userProfile.preferences.topics.length > 0 && (
                    <span className="user-interests">
                      Interested in: {aiAgent.userProfile.preferences.topics.slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}>
              ✕
            </button>
            <button 
              className="chatbot-settings" 
              onClick={() => setShowUsabilityTest(true)}
              title="Run Usability Test"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button 
              className="chatbot-settings" 
              onClick={() => setShowEvaluation(true)}
              title="Evaluate AI Performance"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button 
              className="chatbot-settings" 
              onClick={() => setShowPersonalization(true)}
              title="Personalize Soli"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
                <div className="message-content">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
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
            <>
              {insights.length > 0 && (
                <div className="insights-section">
                  <div className="insights-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FDB813"/>
                    </svg>
                    Insights for You
                  </div>
                  {insights.map((insight, i) => (
                    <div key={i} className={`insight-card ${insight.type}`}>
                      <p className="insight-message">{insight.message}</p>
                      {insight.action && (
                        <button 
                          className="insight-action"
                          onClick={() => handleSuggestionClick(insight.action)}
                        >
                          {insight.action}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="recommended-questions">
                <div className="rec-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="#0DA2E7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {aiAgent.userProfile.interactions === 0 ? 'Suggested Questions' : 'Based on Your Interests'}
                </div>
                {recommendedQuestions.map((q, i) => (
                  <button
                    key={i}
                    className="rec-question"
                    onClick={() => handleSuggestionClick(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Dynamic suggestions after messages */}
          {suggestions.length > 0 && messages.length > 1 && (
            <div className="dynamic-suggestions">
              <div className="suggestions-header">Quick Actions</div>
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  className="suggestion-btn"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Follow-up questions */}
          {followUps.length > 0 && messages.length > 1 && (
            <div className="follow-ups">
              <div className="followup-header">Continue exploring:</div>
              {followUps.map((followUp, i) => (
                <button
                  key={i}
                  className="followup-btn"
                  onClick={() => sendMessage(followUp)}
                >
                  {followUp}
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
      
      {showPersonalization && (
        <AIPersonalizationPanel
          aiAgent={aiAgent}
          onClose={() => setShowPersonalization(false)}
        />
      )}

      {showEvaluation && (
        <AIEvaluationPanel
          isOpen={showEvaluation}
          onClose={() => setShowEvaluation(false)}
        />
      )}

      {showUsabilityTest && (
        <div className="panel-overlay">
          <div className="panel-container">
            <button 
              className="panel-close" 
              onClick={() => setShowUsabilityTest(false)}
            >
              ✕
            </button>
            <UsabilityTestRunner />
          </div>
        </div>
      )}
    </>
  );
}
