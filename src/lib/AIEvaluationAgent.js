// AI Evaluation Agent for SolarEase
// Tests AI agent performance across multiple dimensions with quantitative metrics

class AIEvaluationAgent {
  constructor(aiAgent) {
    this.aiAgent = aiAgent;
    this.testResults = [];
    this.metrics = this.initializeMetrics();
    this.testScenarios = this.loadTestScenarios();
    this.isRunning = false;
  }

  initializeMetrics() {
    return {
      // Response Quality Metrics
      responseAccuracy: [],
      responseRelevance: [],
      responseLength: [],
      responseTime: [],
      
      // Personalization Metrics
      personalizationScore: [],
      contextAwareness: [],
      memoryRetention: [],
      profileAccuracy: [],
      
      // User Experience Metrics
      suggestionRelevance: [],
      intentDetectionAccuracy: [],
      conversationFlow: [],
      taskCompletion: [],
      
      // Technical Metrics
      errorRate: [],
      apiResponseTimes: [],
      cacheEfficiency: [],
      sessionManagement: [],
      
      // Learning & Adaptation
      learningEfficiency: [],
      adaptationSpeed: [],
      behaviorPrediction: [],
      preferenceLearning: []
    };
  }

  loadTestScenarios() {
    return [
      // Beginner User Scenarios
      {
        category: 'beginner_user',
        name: 'First Time Solar Inquiry',
        userProfile: {
          interactions: 0,
          priorExperience: 'beginner',
          goals: [],
          location: null
        },
        testMessages: [
          "I'm interested in solar energy but don't know where to start",
          "How much does solar cost?",
          "Is solar worth it for a small house?"
        ],
        expectedBehaviors: {
          shouldProvideBasics: true,
          shouldAskLocationQuestions: true,
          shouldOfferSimpleCalculations: true,
          shouldAvoidTechnicalJargon: true
        }
      },
      
      // Expert User Scenarios
      {
        category: 'expert_user',
        name: 'Technical Solar Analysis',
        userProfile: {
          interactions: 25,
          priorExperience: 'expert',
          goals: ['save_money', 'energy_independence'],
          location: 'Seattle, WA',
          preferences: {
            detailLevel: 'detailed',
            communicationStyle: 'technical'
          }
        },
        testMessages: [
          "What's the optimal inverter configuration for a 15kW system with partial shading?",
          "Compare micro-inverters vs power optimizers for my specific roof layout",
          "How do Washington state REC markets affect my long-term ROI projections?"
        ],
        expectedBehaviors: {
          shouldProvideTechnicalDetails: true,
          shouldReferenceUserHistory: true,
          shouldOfferAdvancedTools: true,
          shouldMentionLocation: true
        }
      },
      
      // Community Solar Scenarios
      {
        category: 'community_solar',
        name: 'Community Solar Interest',
        userProfile: {
          interactions: 5,
          solarInterest: 'community',
          location: 'Spokane, WA'
        },
        testMessages: [
          "Tell me about community solar options",
          "How can I start a community solar project?",
          "What are the benefits of group purchasing?"
        ],
        expectedBehaviors: {
          shouldSuggestNegotiationTool: true,
          shouldExplainCooperativeBenefits: true,
          shouldOfferLocalContext: true,
          shouldTrackCommunityInterest: true
        }
      },
      
      // ROI Analysis Scenarios
      {
        category: 'roi_analysis',
        name: 'Financial Analysis Request',
        userProfile: {
          interactions: 3,
          goals: ['save_money'],
          location: 'Tacoma, WA'
        },
        contextData: {
          roiData: {
            systemSize: 8,
            cost: 24000,
            location: 'Tacoma, WA',
            paybackPeriod: 7.5
          }
        },
        testMessages: [
          "What's my return on investment for solar?",
          "Is this a good deal compared to other options?",
          "How does my ROI compare to community solar?"
        ],
        expectedBehaviors: {
          shouldUseExistingROIData: true,
          shouldSuggestComparisons: true,
          shouldOfferOptimizations: true,
          shouldUpdateUserPreferences: true
        }
      },
      
      // Memory & Context Scenarios
      {
        category: 'memory_context',
        name: 'Conversation Continuity',
        userProfile: {
          name: 'Sarah',
          interactions: 10,
          location: 'Bellingham, WA'
        },
        conversationHistory: [
          { role: 'user', content: 'I have a 1500 sq ft house' },
          { role: 'assistant', content: 'For a 1500 sq ft house in Bellingham...' },
          { role: 'user', content: 'My electricity bill is $180/month' }
        ],
        testMessages: [
          "Based on what we discussed about my house, what size system do I need?",
          "Remember I mentioned my $180 bill - how much could I save?",
          "You mentioned Bellingham earlier - are there local incentives?"
        ],
        expectedBehaviors: {
          shouldReferenceHouseSize: true,
          shouldRememberElectricityBill: true,
          shouldUseLocationContext: true,
          shouldMaintainPersonalization: true
        }
      },
      
      // Error Handling Scenarios
      {
        category: 'error_handling',
        name: 'Ambiguous Input Handling',
        userProfile: {
          interactions: 2
        },
        testMessages: [
          "solar thing",
          "help me with the stuff",
          "calculate it",
          "",
          "sdjfksldf random text"
        ],
        expectedBehaviors: {
          shouldAskClarifyingQuestions: true,
          shouldOfferSpecificHelp: true,
          shouldHandleGracefully: true,
          shouldNotCrash: true
        }
      }
    ];
  }

  // Run comprehensive evaluation
  async runEvaluation(options = {}) {
    if (this.isRunning) {
      throw new Error('Evaluation already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('🚀 Starting AI Agent Evaluation...');
      
      const results = {
        testResults: [],
        metrics: {},
        summary: {},
        timestamp: new Date().toISOString(),
        duration: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0
      };

      // Run each test scenario
      for (const scenario of this.testScenarios) {
        if (options.categories && !options.categories.includes(scenario.category)) {
          continue;
        }

        console.log(`📋 Testing: ${scenario.name}`);
        const scenarioResult = await this.runScenario(scenario);
        results.testResults.push(scenarioResult);
        results.totalTests++;
        
        if (scenarioResult.passed) {
          results.passedTests++;
        } else {
          results.failedTests++;
        }
      }

      // Calculate aggregate metrics
      results.metrics = this.calculateAggregateMetrics();
      results.summary = this.generateSummary(results);
      results.duration = Date.now() - startTime;

      this.testResults.push(results);
      
      console.log('✅ Evaluation Complete:', results.summary);
      return results;
      
    } finally {
      this.isRunning = false;
    }
  }

  // Run individual test scenario
  async runScenario(scenario) {
    const scenarioStart = Date.now();
    const result = {
      scenario: scenario.name,
      category: scenario.category,
      passed: false,
      scores: {},
      errors: [],
      responses: [],
      behaviorChecks: {},
      duration: 0,
      metrics: {}
    };

    try {
      // Setup test environment
      this.setupScenario(scenario);
      
      // Test each message in the scenario
      for (let i = 0; i < scenario.testMessages.length; i++) {
        const message = scenario.testMessages[i];
        const messageStart = Date.now();
        
        try {
          // Send message to AI agent
          const response = await this.aiAgent.sendMessage(message);
          const responseTime = Date.now() - messageStart;
          
          // Analyze response
          const responseText = response?.message || response || '';
          const analysis = this.analyzeResponse(message, responseText, scenario);
          
          result.responses.push({
            input: message,
            output: responseText,
            responseTime,
            analysis
          });

          // Record metrics
          this.recordMetrics(analysis, responseTime);
          
        } catch (error) {
          result.errors.push({
            message,
            error: error.message,
            step: i
          });
        }
      }

      // Check expected behaviors
      result.behaviorChecks = this.checkExpectedBehaviors(scenario, result.responses);
      
      // Calculate scenario scores
      result.scores = this.calculateScenarioScores(result);
      result.passed = result.scores.overall >= 0.7; // 70% threshold
      
      result.duration = Date.now() - scenarioStart;
      
    } catch (error) {
      result.errors.push({
        message: 'Scenario setup failed',
        error: error.message
      });
    }

    return result;
  }

  // Setup test scenario environment
  setupScenario(scenario) {
    // Reset AI agent state
    this.aiAgent.userProfile = { ...this.aiAgent.loadUserProfile(), ...scenario.userProfile };
    
    // Setup context data
    if (scenario.contextData) {
      this.aiAgent.updateContext(scenario.contextData);
    }
    
    // Setup conversation history
    if (scenario.conversationHistory) {
      this.aiAgent.conversationMemory.recentConversations = scenario.conversationHistory.map(msg => ({
        timestamp: new Date().toISOString(),
        type: 'conversation',
        data: msg
      }));
    }
  }

  // Analyze AI response quality
  analyzeResponse(input, response, scenario) {
    const analysis = {
      relevance: 0,
      accuracy: 0,
      personalization: 0,
      contextAwareness: 0,
      lengthAppropriate: false,
      technicalLevel: 'unknown',
      suggestionsRelevant: false,
      intentDetected: false
    };

    const inputLower = input.toLowerCase();
    const responseLower = response.message.toLowerCase();
    
    // Relevance Analysis
    const keyTerms = this.extractKeyTerms(input);
    let relevantTerms = 0;
    keyTerms.forEach(term => {
      if (responseLower.includes(term.toLowerCase())) {
        relevantTerms++;
      }
    });
    analysis.relevance = keyTerms.length > 0 ? relevantTerms / keyTerms.length : 0;

    // Personalization Analysis
    if (scenario.userProfile.name && responseLower.includes(scenario.userProfile.name.toLowerCase())) {
      analysis.personalization += 0.3;
    }
    if (scenario.userProfile.location && responseLower.includes(scenario.userProfile.location.toLowerCase().split(',')[0])) {
      analysis.personalization += 0.3;
    }
    if (scenario.userProfile.priorExperience === 'beginner' && this.containsBeginnerfriendlyLanguage(response.message)) {
      analysis.personalization += 0.4;
    } else if (scenario.userProfile.priorExperience === 'expert' && this.containsTechnicalLanguage(response.message)) {
      analysis.personalization += 0.4;
    }

    // Context Awareness
    if (scenario.contextData?.roiData) {
      const roiTerms = ['payback', 'cost', 'system', scenario.contextData.roiData.location];
      let contextTerms = 0;
      roiTerms.forEach(term => {
        if (responseLower.includes(term.toLowerCase())) contextTerms++;
      });
      analysis.contextAwareness = contextTerms / roiTerms.length;
    }

    // Length Appropriateness
    const expectedLength = this.getExpectedResponseLength(scenario, input);
    analysis.lengthAppropriate = Math.abs(response.message.length - expectedLength) < expectedLength * 0.5;

    // Intent Detection
    analysis.intentDetected = this.checkIntentDetection(input, response);

    // Suggestions Relevance
    if (response.suggestions && response.suggestions.length > 0) {
      analysis.suggestionsRelevant = this.evaluateSuggestionRelevance(input, response.suggestions, scenario);
    }

    return analysis;
  }

  // Extract key terms from user input
  extractKeyTerms(input) {
    const solarTerms = ['solar', 'panel', 'energy', 'roi', 'cost', 'community', 'inverter', 'installation', 'savings', 'payback'];
    const locationTerms = ['seattle', 'spokane', 'tacoma', 'bellingham', 'washington', 'wa'];
    const words = input.toLowerCase().split(' ');
    
    return words.filter(word => 
      solarTerms.includes(word) || 
      locationTerms.includes(word) ||
      word.length > 6
    );
  }

  // Check if response contains beginner-friendly language
  containsBeginnerfriendlyLanguage(response) {
    const beginnerIndicators = ['let me explain', 'simply put', 'to start', 'basic', 'introduction', 'first step'];
    return beginnerIndicators.some(indicator => 
      response.toLowerCase().includes(indicator)
    );
  }

  // Check if response contains technical language
  containsTechnicalLanguage(response) {
    const technicalTerms = ['inverter', 'kwh', 'mppt', 'grid-tie', 'pv', 'efficiency', 'degradation', 'irradiance'];
    return technicalTerms.some(term => 
      response.toLowerCase().includes(term)
    );
  }

  // Get expected response length based on scenario
  getExpectedResponseLength(scenario, input) {
    const baseLength = 200;
    
    if (scenario.userProfile.priorExperience === 'expert') {
      return baseLength * 1.5;
    }
    if (scenario.userProfile.priorExperience === 'beginner') {
      return baseLength * 0.8;
    }
    if (scenario.userProfile.preferences?.detailLevel === 'detailed') {
      return baseLength * 1.8;
    }
    if (scenario.userProfile.preferences?.detailLevel === 'brief') {
      return baseLength * 0.6;
    }
    
    return baseLength;
  }

  // Check intent detection accuracy
  checkIntentDetection(input, response) {
    const inputIntent = this.detectExpectedIntent(input);
    const responseContent = response.message.toLowerCase();
    
    switch (inputIntent) {
      case 'roi_inquiry':
        return responseContent.includes('cost') || responseContent.includes('savings') || responseContent.includes('payback');
      case 'community_solar':
        return responseContent.includes('community') || responseContent.includes('group') || responseContent.includes('cooperative');
      case 'technical_question':
        return responseContent.includes('technical') || responseContent.includes('specification');
      case 'location_inquiry':
        return responseContent.includes('area') || responseContent.includes('location') || responseContent.includes('local');
      default:
        return true; // General responses are acceptable for unclear intent
    }
  }

  // Detect expected intent from input
  detectExpectedIntent(input) {
    const inputLower = input.toLowerCase();
    
    if (inputLower.includes('roi') || inputLower.includes('cost') || inputLower.includes('save') || inputLower.includes('payback')) {
      return 'roi_inquiry';
    }
    if (inputLower.includes('community') || inputLower.includes('group') || inputLower.includes('together')) {
      return 'community_solar';
    }
    if (inputLower.includes('inverter') || inputLower.includes('technical') || inputLower.includes('specification')) {
      return 'technical_question';
    }
    if (inputLower.includes('area') || inputLower.includes('location') || inputLower.includes('local')) {
      return 'location_inquiry';
    }
    
    return 'general';
  }

  // Evaluate suggestion relevance
  evaluateSuggestionRelevance(input, suggestions, scenario) {
    if (!suggestions || suggestions.length === 0) return false;
    
    const inputIntent = this.detectExpectedIntent(input);
    let relevantCount = 0;
    
    suggestions.forEach(suggestion => {
      const suggestionLower = suggestion.toLowerCase();
      
      switch (inputIntent) {
        case 'roi_inquiry':
          if (suggestionLower.includes('roi') || suggestionLower.includes('calculator') || suggestionLower.includes('cost')) {
            relevantCount++;
          }
          break;
        case 'community_solar':
          if (suggestionLower.includes('community') || suggestionLower.includes('negotiation') || suggestionLower.includes('group')) {
            relevantCount++;
          }
          break;
        default:
          relevantCount++; // General suggestions are okay for unclear intent
      }
    });
    
    return relevantCount > 0;
  }

  // Check expected behaviors for scenario
  checkExpectedBehaviors(scenario, responses) {
    const checks = {};
    const allResponseText = responses.map(r => r.output).join(' ').toLowerCase();
    
    Object.keys(scenario.expectedBehaviors).forEach(behavior => {
      const expected = scenario.expectedBehaviors[behavior];
      
      switch (behavior) {
        case 'shouldProvideBasics':
          checks[behavior] = expected ? this.containsBeginnerfriendlyLanguage(allResponseText) : true;
          break;
        case 'shouldAskLocationQuestions':
          checks[behavior] = expected ? (allResponseText.includes('location') || allResponseText.includes('area') || allResponseText.includes('where')) : true;
          break;
        case 'shouldOfferSimpleCalculations':
          checks[behavior] = expected ? (allResponseText.includes('calculator') || allResponseText.includes('estimate')) : true;
          break;
        case 'shouldProvideTechnicalDetails':
          checks[behavior] = expected ? this.containsTechnicalLanguage(allResponseText) : true;
          break;
        case 'shouldReferenceUserHistory':
          checks[behavior] = expected ? (allResponseText.includes('previous') || allResponseText.includes('remember') || allResponseText.includes(scenario.userProfile.name?.toLowerCase())) : true;
          break;
        case 'shouldSuggestNegotiationTool':
          checks[behavior] = expected ? allResponseText.includes('negotiation') : true;
          break;
        case 'shouldUseExistingROIData':
          checks[behavior] = expected ? (responses.some(r => r.analysis.contextAwareness > 0.5)) : true;
          break;
        case 'shouldHandleGracefully':
          checks[behavior] = expected ? !responses.some(r => r.output.includes('error') || r.output.length < 10) : true;
          break;
        default:
          checks[behavior] = true;
      }
    });
    
    return checks;
  }

  // Calculate scenario scores
  calculateScenarioScores(result) {
    const scores = {
      relevance: 0,
      personalization: 0,
      contextAwareness: 0,
      behaviorCompliance: 0,
      overall: 0
    };

    if (result.responses.length > 0) {
      // Average response analysis scores
      scores.relevance = result.responses.reduce((sum, r) => sum + r.analysis.relevance, 0) / result.responses.length;
      scores.personalization = result.responses.reduce((sum, r) => sum + r.analysis.personalization, 0) / result.responses.length;
      scores.contextAwareness = result.responses.reduce((sum, r) => sum + r.analysis.contextAwareness, 0) / result.responses.length;
    }

    // Behavior compliance score
    const behaviorKeys = Object.keys(result.behaviorChecks);
    if (behaviorKeys.length > 0) {
      scores.behaviorCompliance = behaviorKeys.filter(key => result.behaviorChecks[key]).length / behaviorKeys.length;
    }

    // Overall score (weighted average)
    scores.overall = (
      scores.relevance * 0.3 +
      scores.personalization * 0.25 +
      scores.contextAwareness * 0.25 +
      scores.behaviorCompliance * 0.2
    );

    return scores;
  }

  // Record metrics for analysis
  recordMetrics(analysis, responseTime) {
    this.metrics.responseAccuracy.push(analysis.accuracy);
    this.metrics.responseRelevance.push(analysis.relevance);
    this.metrics.responseTime.push(responseTime);
    this.metrics.personalizationScore.push(analysis.personalization);
    this.metrics.contextAwareness.push(analysis.contextAwareness);
    this.metrics.intentDetectionAccuracy.push(analysis.intentDetected ? 1 : 0);
  }

  // Calculate aggregate metrics
  calculateAggregateMetrics() {
    const aggregates = {};
    
    Object.keys(this.metrics).forEach(metricName => {
      const values = this.metrics[metricName];
      if (values.length > 0) {
        aggregates[metricName] = {
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
          standardDeviation: this.calculateStandardDeviation(values)
        };
      }
    });
    
    return aggregates;
  }

  // Calculate standard deviation
  calculateStandardDeviation(values) {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(val => Math.pow(val - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  // Generate evaluation summary
  generateSummary(results) {
    const summary = {
      overallScore: 0,
      strengths: [],
      weaknesses: [],
      recommendations: [],
      passRate: results.passedTests / results.totalTests,
      averageResponseTime: 0,
      categoricalPerformance: {}
    };

    // Calculate overall score from all scenario scores
    if (results.testResults.length > 0) {
      summary.overallScore = results.testResults.reduce((sum, test) => sum + test.scores.overall, 0) / results.testResults.length;
    }

    // Average response time
    if (results.metrics.responseTime) {
      summary.averageResponseTime = results.metrics.responseTime.average;
    }

    // Categorical performance
    const categories = [...new Set(results.testResults.map(test => test.category))];
    categories.forEach(category => {
      const categoryTests = results.testResults.filter(test => test.category === category);
      const categoryScore = categoryTests.reduce((sum, test) => sum + test.scores.overall, 0) / categoryTests.length;
      summary.categoricalPerformance[category] = {
        score: categoryScore,
        passed: categoryTests.filter(test => test.passed).length,
        total: categoryTests.length
      };
    });

    // Identify strengths and weaknesses
    if (results.metrics.responseRelevance && results.metrics.responseRelevance.average > 0.8) {
      summary.strengths.push('High response relevance');
    }
    if (results.metrics.personalizationScore && results.metrics.personalizationScore.average > 0.7) {
      summary.strengths.push('Strong personalization capabilities');
    }
    if (results.metrics.contextAwareness && results.metrics.contextAwareness.average > 0.6) {
      summary.strengths.push('Good context awareness');
    }

    if (results.metrics.responseTime && results.metrics.responseTime.average > 2000) {
      summary.weaknesses.push('Slow response times');
      summary.recommendations.push('Optimize AI response generation');
    }
    if (summary.categoricalPerformance.error_handling && summary.categoricalPerformance.error_handling.score < 0.6) {
      summary.weaknesses.push('Poor error handling');
      summary.recommendations.push('Improve input validation and error responses');
    }

    return summary;
  }

  // Generate detailed report
  generateReport() {
    if (this.testResults.length === 0) {
      return { error: 'No test results available' };
    }

    const latestResults = this.testResults[this.testResults.length - 1];
    
    return {
      ...latestResults,
      historicalData: this.testResults.length > 1 ? this.testResults.slice(-5) : null,
      recommendations: this.generateDetailedRecommendations(latestResults)
    };
  }

  // Generate detailed recommendations
  generateDetailedRecommendations(results) {
    const recommendations = [];

    // Performance-based recommendations
    if (results.summary.overallScore < 0.7) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        issue: 'Overall AI performance below threshold',
        suggestion: 'Review and improve response generation algorithms',
        targetMetric: 'Overall score to >0.7'
      });
    }

    if (results.metrics.responseTime && results.metrics.responseTime.average > 1500) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        issue: 'Response times too slow',
        suggestion: 'Implement response caching and optimize API calls',
        targetMetric: 'Average response time <1000ms'
      });
    }

    // Personalization recommendations
    if (results.metrics.personalizationScore && results.metrics.personalizationScore.average < 0.6) {
      recommendations.push({
        priority: 'high',
        category: 'personalization',
        issue: 'Low personalization effectiveness',
        suggestion: 'Enhance user profile utilization in response generation',
        targetMetric: 'Personalization score >0.7'
      });
    }

    // Context awareness recommendations
    if (results.metrics.contextAwareness && results.metrics.contextAwareness.average < 0.5) {
      recommendations.push({
        priority: 'medium',
        category: 'context',
        issue: 'Poor context awareness',
        suggestion: 'Improve context data integration in prompt generation',
        targetMetric: 'Context awareness >0.6'
      });
    }

    return recommendations;
  }

  // Reset evaluation state
  reset() {
    this.testResults = [];
    this.metrics = this.initializeMetrics();
    this.isRunning = false;
  }
}

export default AIEvaluationAgent;