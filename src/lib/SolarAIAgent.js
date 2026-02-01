// Enhanced AI Agent System for SolarEase
// Provides personalized, contextual AI interactions with memory and tool integration

import { API_URL } from '../config'

class SolarAIAgent {
  constructor() {
    this.userProfile = this.loadUserProfile();
    this.conversationMemory = this.loadConversationMemory();
    this.contextualData = {
      currentLocation: null,
      roiData: null,
      negotiations: [],
      preferences: {},
      userContracts: []
    };
    
    // Listen for context updates from other components
    this.setupEventListeners();
  }

  // Setup event listeners for context updates
  setupEventListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('roiDataUpdated', (event) => {
        this.updateContext({ roiData: event.detail });
      });
      
      window.addEventListener('aiExplanationGenerated', (event) => {
        this.trackInteraction('ai_explanation', event.detail);
      });
      
      window.addEventListener('negotiationCompleted', (event) => {
        this.updateContext({ negotiation: event.detail });
      });
    }
  }

  // Load user profile from localStorage
  loadUserProfile() {
    const stored = localStorage.getItem('soli_user_profile');
    if (stored) {
      return JSON.parse(stored);
    }
    
    return {
      id: this.generateUserId(),
      name: null,
      location: null,
      propertyType: null, // residential, commercial, industrial
      energyUsage: null,
      solarInterest: null, // community, individual, both
      priorExperience: null, // beginner, intermediate, expert
      goals: [], // save_money, environment, energy_independence
      interactions: 0,
      firstVisit: new Date().toISOString(),
      lastVisit: new Date().toISOString(),
      preferences: {
        communicationStyle: 'friendly', // friendly, professional, technical
        detailLevel: 'moderate', // brief, moderate, detailed
        topics: [] // ROI, community_solar, PPAs, incentives, etc.
      }
    };
  }

  // Load conversation memory
  loadConversationMemory() {
    const stored = localStorage.getItem('soli_conversation_memory');
    if (stored) {
      return JSON.parse(stored);
    }
    
    return {
      recentConversations: [],
      keyTopics: [],
      userQuestions: [],
      followUps: []
    };
  }

  // Save user profile to localStorage
  saveUserProfile() {
    localStorage.setItem('soli_user_profile', JSON.stringify(this.userProfile));
  }

  // Save conversation memory
  saveConversationMemory() {
    localStorage.setItem('soli_conversation_memory', JSON.stringify(this.conversationMemory));
  }

  // Generate unique user ID
  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Update user context with new data
  updateContext(data) {
    if (data.location) this.contextualData.currentLocation = data.location;
    if (data.roiData) this.contextualData.roiData = data.roiData;
    if (data.negotiation) this.contextualData.negotiations.push(data.negotiation);
    if (data.preferences) Object.assign(this.contextualData.preferences, data.preferences);
  }

  // Track user interaction
  trackInteraction(type, data = {}) {
    this.userProfile.interactions++;
    this.userProfile.lastVisit = new Date().toISOString();
    
    // Learn from user behavior
    if (type === 'question' && data.topic) {
      if (!this.userProfile.preferences.topics.includes(data.topic)) {
        this.userProfile.preferences.topics.push(data.topic);
      }
    }
    
    // Add to conversation memory
    this.conversationMemory.recentConversations.push({
      timestamp: new Date().toISOString(),
      type,
      data
    });

    // Keep only last 50 conversations
    if (this.conversationMemory.recentConversations.length > 50) {
      this.conversationMemory.recentConversations = this.conversationMemory.recentConversations.slice(-50);
    }
    
    this.saveUserProfile();
    this.saveConversationMemory();
  }

  // Detect user characteristics from conversation
  analyzeUserIntent(message) {
    const intent = {
      type: 'general',
      urgency: 'normal',
      complexity: 'simple',
      topics: []
    };

    // Handle undefined/null message
    if (!message || typeof message !== 'string') {
      return intent;
    }

    const lowerMessage = message.toLowerCase();
    
    // Intent detection
    if (lowerMessage.includes('roi') || lowerMessage.includes('return') || lowerMessage.includes('payback')) {
      intent.type = 'roi_analysis';
      intent.topics.push('ROI');
    }
    
    if (lowerMessage.includes('community') && lowerMessage.includes('solar')) {
      intent.type = 'community_solar';
      intent.topics.push('community_solar');
    }
    
    if (lowerMessage.includes('negotiate') || lowerMessage.includes('deal') || lowerMessage.includes('agreement')) {
      intent.type = 'negotiation';
      intent.topics.push('negotiation');
    }

    if (lowerMessage.includes('ppa') || lowerMessage.includes('power purchase')) {
      intent.topics.push('PPA');
    }

    // Urgency detection
    if (lowerMessage.includes('urgent') || lowerMessage.includes('asap') || lowerMessage.includes('quickly')) {
      intent.urgency = 'high';
    }

    // Complexity detection
    if (lowerMessage.includes('detailed') || lowerMessage.includes('technical') || lowerMessage.includes('explain')) {
      intent.complexity = 'detailed';
    }

    return intent;
  }

  // Generate contextual system prompt based on user profile and current context
  generateContextualPrompt(userMessage) {
    // Handle undefined/null userMessage
    if (!userMessage || typeof userMessage !== 'string') {
      userMessage = '';
    }
    
    const intent = this.analyzeUserIntent(userMessage);
    
    let prompt = `You are Soli, an intelligent and personalized solar energy agent for SolarEase. `;
    
    // Personalization based on user profile
    if (this.userProfile.name) {
      prompt += `You're talking with ${this.userProfile.name}. `;
    }
    
    if (this.userProfile.interactions === 0) {
      prompt += `This is their first interaction - be extra welcoming and helpful. `;
    } else if (this.userProfile.interactions > 10) {
      prompt += `They're a returning user with ${this.userProfile.interactions} previous interactions - be familiar but not repetitive. `;
    }

    // Add location context
    if (this.contextualData.currentLocation) {
      prompt += `They're currently looking at solar options in ${this.contextualData.currentLocation}. `;
    }

    // Add ROI context
    if (this.contextualData.roiData) {
      const roi = this.contextualData.roiData;
      prompt += `They recently calculated solar ROI with these parameters: ${roi.systemSize}kW system, $${roi.cost} cost, ${roi.location}. `;
    }

    // Add negotiation context
    if (this.contextualData.negotiations.length > 0) {
      const lastNeg = this.contextualData.negotiations[this.contextualData.negotiations.length - 1];
      prompt += `They recently used the negotiation tool with ${lastNeg.participantCount} participants. `;
    }

    // Communication style adaptation
    const style = this.userProfile.preferences.communicationStyle;
    if (style === 'professional') {
      prompt += `Use a professional, business-focused tone. `;
    } else if (style === 'technical') {
      prompt += `They prefer technical details - be specific about calculations, methodologies, and data. `;
    } else {
      prompt += `Use a friendly, approachable tone. `;
    }

    // Detail level adaptation
    const detailLevel = this.userProfile.preferences.detailLevel;
    if (detailLevel === 'brief') {
      prompt += `Keep responses concise and to the point. `;
    } else if (detailLevel === 'detailed') {
      prompt += `Provide comprehensive explanations with examples and context. `;
    }

    // Add conversation memory context
    if (this.conversationMemory.recentConversations.length > 0) {
      const recentTopics = this.conversationMemory.recentConversations
        .slice(-5)
        .map(c => c.data?.topic)
        .filter(Boolean);
      
      if (recentTopics.length > 0) {
        prompt += `Recent conversation topics: ${recentTopics.join(', ')}. `;
      }
    }

    // Intent-specific instructions
    switch (intent.type) {
      case 'roi_analysis':
        prompt += `They're asking about ROI analysis. Be specific about financial metrics, payback periods, and factors affecting returns. `;
        if (this.contextualData.roiData) {
          prompt += `Reference their current analysis if relevant. `;
        } else {
          prompt += `Suggest they try the ROI simulator for personalized calculations. `;
        }
        break;
        
      case 'community_solar':
        prompt += `They're interested in community solar. Emphasize collective benefits, cost sharing, and how communities can achieve better outcomes together. `;
        break;
        
      case 'negotiation':
        prompt += `They're asking about negotiation. Focus on fair allocation principles, Nash bargaining theory, and how cooperation creates value. `;
        if (this.contextualData.negotiations.length > 0) {
          prompt += `They have experience with the negotiation tool, so build on that. `;
        }
        break;
    }

    prompt += `

Core capabilities you can reference:
- ROI Simulator: Interactive tool for calculating solar returns
- Negotiation Tool: Nash bargaining for fair PPA allocations  
- Location-based analysis for Washington state communities
- PPA structure and terms explanation

Guidelines:
- Be proactive: suggest next steps or related tools when appropriate
- Remember context: reference previous conversations naturally
- Be actionable: provide specific recommendations
- Show personality: You're not just an API, you're Soli - knowledgeable, encouraging, and genuinely helpful
- Use "we" language to build partnership ("let's explore", "we can calculate")

Current message context: ${intent.complexity} complexity, ${intent.urgency} urgency, topics: ${intent.topics.join(', ') || 'general'}`;

    return prompt;
  }

  // Enhanced chat method with personalization
  async sendMessage(message, conversationHistory = []) {
    try {
      // Handle undefined/null message
      if (!message || typeof message !== 'string') {
        message = '';
      }
      
      this.trackInteraction('question', { 
        message: message.substring(0, 100),
        topic: this.analyzeUserIntent(message).topics?.[0] || 'general'
      });

      // Use enhanced prompt that includes contract context
      const systemPrompt = await this.generateContextualPromptWithContracts(message, '1');
      
      const response = await fetch(`${API_URL}/api/enhanced-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          systemPrompt,
          conversationHistory,
          userProfile: this.userProfile,
          contextualData: this.contextualData
        })
      });

      const data = await response.json();
      
      if (data.result) {
        // Learn from AI response
        this.trackInteraction('response', {
          responseLength: data.result.length,
          suggestions: data.suggestions || []
        });

        // Update user preferences based on response engagement
        if (data.result.length > 300) {
          this.userProfile.preferences.detailLevel = 'detailed';
        } else if (data.result.length < 150) {
          this.userProfile.preferences.detailLevel = 'brief';
        }

        return {
          message: data.result,
          suggestions: data.suggestions || [],
          followUps: data.followUps || []
        };
      }
      
      throw new Error('No response from AI agent');
    } catch (error) {
      console.error('AI Agent Error:', error);
      return {
        message: "I'm having trouble connecting right now. Let me try to help in another way - would you like me to show you our ROI simulator or negotiation tool?",
        suggestions: [
          "Try ROI Simulator",
          "Open Negotiation Tool", 
          "Browse FAQ"
        ]
      };
    }
  }

  // Get personalized suggestions based on user state
  getPersonalizedSuggestions() {
    const suggestions = [];
    
    // Contract-related suggestions
    if (this.contextualData.userContracts && this.contextualData.userContracts.length > 0) {
      suggestions.push(`Analyze my ${this.contextualData.userContracts.length} uploaded contract${this.contextualData.userContracts.length > 1 ? 's' : ''}`);
      if (!this.contextualData.roiData) {
        suggestions.push("How do my contract terms compare to market rates?");
      }
    }
    
    // Based on user profile
    if (!this.userProfile.location && !this.contextualData.currentLocation) {
      suggestions.push("What's the solar potential in your area?");
    }
    
    if (this.userProfile.preferences.topics.includes('ROI') && !this.contextualData.roiData) {
      suggestions.push("Calculate your personalized solar ROI");
    }
    
    if (this.userProfile.preferences.topics.includes('community_solar') && this.contextualData.negotiations.length === 0) {
      suggestions.push("How can I negotiate a better community solar deal?");
    }

    // Contract-context suggestions based on existing data
    if (this.contextualData.userContracts?.length > 0 && this.contextualData.roiData) {
      suggestions.push("Compare my contract ROI with community solar options");
    }

    // Default suggestions if no personalization available
    if (suggestions.length === 0) {
      suggestions.push(
        "What's the ROI for solar in my area?",
        "How do community solar projects work?",
        "What incentives are available?"
      );
    }
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  // Get proactive insights based on user data
  getProactiveInsights() {
    const insights = [];
    
    // Contract-based insights
    if (this.contextualData.userContracts && this.contextualData.userContracts.length > 0) {
      insights.push({
        type: 'opportunity',
        message: `📄 You have ${this.contextualData.userContracts.length} contract${this.contextualData.userContracts.length > 1 ? 's' : ''} uploaded. I can analyze the terms and suggest improvements for future negotiations.`,
        action: 'Analyze my contracts'
      });

      // If they have contracts but no ROI analysis
      if (!this.contextualData.roiData) {
        insights.push({
          type: 'suggestion',
          message: `Since you have contract data, compare it with our ROI calculator to see if you're getting a good deal.`,
          action: 'Calculate ROI'
        });
      }
    }
    
    // ROI-based insights
    if (this.contextualData.roiData) {
      const roi = this.contextualData.roiData;
      if (roi.paybackPeriod && roi.paybackPeriod < 8) {
        insights.push({
          type: 'opportunity',
          message: `Your ${roi.location} location shows excellent solar potential with a ${roi.paybackPeriod}-year payback. Have you considered community solar to reduce costs further?`,
          action: 'Open Negotiation Tool'
        });
      }
      
      // Suggest location optimization
      if (roi.location && roi.paybackPeriod > 9) {
        insights.push({
          type: 'suggestion',
          message: `Your current location shows ${roi.paybackPeriod}-year payback. Nearby communities might have better solar incentives - want to explore other Washington locations?`,
          action: 'Compare Locations'
        });
      }
    }
    
    // Community size insights
    if (this.contextualData.negotiations.length > 0) {
      const lastNeg = this.contextualData.negotiations[this.contextualData.negotiations.length - 1];
      if (lastNeg.participantCount < 3) {
        insights.push({
          type: 'suggestion',
          message: `Your negotiation showed strong results with ${lastNeg.participantCount} participants. Adding more community members could unlock even better PPA terms.`,
          action: 'Learn about community outreach'
        });
      }
      
      // Suggest next steps after successful negotiation
      if (lastNeg.totalSurplus > 100000) {
        insights.push({
          type: 'opportunity',
          message: `Great news! Your community generated $${Math.round(lastNeg.totalSurplus/1000)}K in cooperative value. Ready to move forward with implementation?`,
          action: 'Implementation Checklist'
        });
      }
    }
    
    // Profile-based insights
    if (this.userProfile.solarInterest === 'community' && this.contextualData.negotiations.length === 0) {
      insights.push({
        type: 'suggestion',
        message: 'Since you\'re interested in community solar, try our Nash bargaining tool to see how cooperation can benefit everyone.',
        action: 'Try Negotiation Tool'
      });
    }
    
    // Experience-based insights
    if (this.userProfile.priorExperience === 'beginner' && this.userProfile.interactions > 5) {
      insights.push({
        type: 'suggestion',
        message: 'You\'ve been exploring solar options actively! Based on your questions, you might be ready to run some real calculations.',
        action: 'Calculate ROI'
      });
    }
    
    return insights.slice(0, 3); // Limit to 3 insights max
  }

  // Get smart pre-fill data for forms
  getSmartPreFillData() {
    const prefillData = {};
    
    // User profile data
    if (this.userProfile.name) {
      prefillData.name = this.userProfile.name;
    }
    
    if (this.userProfile.location) {
      prefillData.location = this.userProfile.location;
      prefillData.address = this.userProfile.location;
    }
    
    // ROI context data
    if (this.contextualData.roiData) {
      prefillData.systemSize = this.contextualData.roiData.systemSize;
      prefillData.location = this.contextualData.roiData.location;
      prefillData.annualGeneration = this.contextualData.roiData.systemSize * 1200; // Estimate kWh
      prefillData.upfrontCost = this.contextualData.roiData.cost || this.contextualData.roiData.systemSize * 1200;
    }
    
    // Negotiation history data
    if (this.contextualData.negotiations.length > 0) {
      const lastNeg = this.contextualData.negotiations[this.contextualData.negotiations.length - 1];
      prefillData.previousNegotiationData = lastNeg;
    }
    
    return prefillData;
  }

  // Smart calculation triggers
  shouldAutoCalculate() {
    const prefillData = this.getSmartPreFillData();
    
    // Auto-calculate ROI if we have sufficient data
    const hasROIData = prefillData.location && prefillData.systemSize;
    
    // Auto-start negotiation if user has completed ROI analysis
    const hasNegotiationData = this.contextualData.roiData && this.userProfile.solarInterest === 'community';
    
    return {
      autoROI: hasROIData,
      autoNegotiation: hasNegotiationData,
      prefillData
    };
  }

  // Generate contextual recommendations based on current page and user data
  getContextualRecommendations(currentPage) {
    const recommendations = [];
    const prefillData = this.getSmartPreFillData();
    
    if (currentPage === 'roi-simulator') {
      if (prefillData.location && prefillData.systemSize) {
        recommendations.push({
          type: 'auto-fill',
          message: `I can pre-fill your ROI calculator with data from your previous analysis (${prefillData.location}, ${prefillData.systemSize}kW).`,
          action: 'auto-fill-roi',
          data: prefillData
        });
      }
      
      if (this.userProfile.solarInterest === 'community') {
        recommendations.push({
          type: 'next-step',
          message: 'After calculating individual ROI, try our negotiation tool to see community solar benefits.',
          action: 'suggest-negotiation'
        });
      }
    }
    
    if (currentPage === 'negotiation-tool') {
      if (prefillData.name && prefillData.systemSize) {
        recommendations.push({
          type: 'auto-fill',
          message: `I can set up your negotiation with your info: ${prefillData.name}, ${prefillData.systemSize}kW system.`,
          action: 'auto-fill-negotiation',
          data: prefillData
        });
      }
      
      if (this.contextualData.roiData && !this.contextualData.negotiations.length) {
        recommendations.push({
          type: 'smart-suggestion',
          message: `Based on your ${this.contextualData.roiData.location} ROI analysis, I recommend starting with 3-4 participants for optimal results.`,
          action: 'smart-participant-suggestion'
        });
      }
    }
    
    return recommendations;
  }

  // Fetch user's uploaded contracts from database
  async fetchUserContracts(userId = '1') {
    try {
      const response = await fetch(`${API_URL}/api/contracts?userId=${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        this.contextualData.userContracts = data.contracts;
        return data.contracts;
      } else {
        console.error('Failed to fetch contracts:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      return [];
    }
  }

  // Get contract analysis for AI context
  async getContractContext(userId = '1') {
    const contracts = await this.fetchUserContracts(userId);
    
    if (contracts.length === 0) {
      return '';
    }

    const contractSummary = contracts.map(contract => {
      return `Contract "${contract.filename || 'Untitled'}" (uploaded ${new Date(contract.created_at).toLocaleDateString()})`;
    }).join(', ');

    return `User has uploaded ${contracts.length} contract(s): ${contractSummary}. `;
  }

  // Enhanced context prompt that includes contract information
  async generateContextualPromptWithContracts(userMessage, userId = '1') {
    const basePrompt = this.generateContextualPrompt(userMessage);
    const contractContext = await this.getContractContext(userId);
    
    if (contractContext) {
      return basePrompt + `\n\nContract Context: ${contractContext}When users mention contracts, rates, terms, or agreements, you can reference their uploaded contracts and offer to analyze them.`;
    }
    
    return basePrompt;
  }

  // Update user contracts (called by UI components)
  updateUserContracts(contracts) {
    this.contextualData.userContracts = contracts;
  }

  // Reset user profile (for testing or privacy)
  resetProfile() {
    localStorage.removeItem('soli_user_profile');
    localStorage.removeItem('soli_conversation_memory');
    this.userProfile = this.loadUserProfile();
    this.conversationMemory = this.loadConversationMemory();
  }
}

export default SolarAIAgent;