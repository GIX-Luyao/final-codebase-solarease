# AI Agent Evaluation Test Scenarios

## Overview
This document details the 24 comprehensive test scenarios used to evaluate the SolarEase AI Assistant "Soli". These scenarios are designed to test different aspects of AI performance across various user types and interaction contexts.

## Test Categories & Scenarios

### 1. Beginner User Experience (`beginner_user`)

**Objective**: Test AI responses for users new to solar energy with no prior experience.

**User Profile**:
- 0 interactions (first-time user)
- Prior experience: Beginner
- No goals set
- No location specified

**Test Scenarios**:
1. **First Solar Inquiry**: "I'm interested in solar energy but don't know where to start"
2. **Cost Question**: "How much does solar cost?"
3. **Value Assessment**: "Is solar worth it for a small house?"

**Expected AI Behaviors**:
-  Provide basic, beginner-friendly explanations
-  Ask location-clarifying questions
-  Offer simple calculators and tools
-  Avoid technical jargon
-  Be welcoming and educational

---

### 2. Expert User Experience (`expert_user`)

**Objective**: Test AI's ability to provide technical depth for experienced solar users.

**User Profile**:
- 25 interactions (experienced user)
- Prior experience: Expert
- Goals: Save money, Energy independence
- Location: Seattle, WA
- Communication style: Technical
- Detail level: Detailed

**Test Scenarios**:
4. **Technical Configuration**: "What's the optimal inverter configuration for a 15kW system with partial shading?"
5. **Component Comparison**: "Compare micro-inverters vs power optimizers for my specific roof layout"
6. **Market Analysis**: "How do Washington state REC markets affect my long-term ROI projections?"

**Expected AI Behaviors**:
-  Provide technical details and specifications
-  Reference user's history and location
-  Offer advanced tools and calculations
-  Use appropriate technical terminology
-  Leverage Seattle-specific context

---

### 3. Community Solar Guidance (`community_solar`)

**Objective**: Test AI's ability to guide users interested in community solar projects.

**User Profile**:
- 5 interactions (moderate experience)
- Solar interest: Community solar
- Location: Spokane, WA

**Test Scenarios**:
7. **Community Solar Overview**: "Tell me about community solar options"
8. **Project Initiation**: "How can I start a community solar project?"
9. **Group Benefits**: "What are the benefits of group purchasing?"

**Expected AI Behaviors**:
-  Suggest negotiation tool for group dynamics
-  Explain cooperative benefits and Nash bargaining
-  Provide location-specific context for Spokane
-  Track and build on community solar interest

---

### 4. ROI Analysis Accuracy (`roi_analysis`)

**Objective**: Test AI's financial analysis capabilities with existing ROI data.

**User Profile**:
- 3 interactions
- Goals: Save money
- Location: Tacoma, WA

**Context Data**:
- System size: 8kW
- Cost: $24,000
- Location: Tacoma, WA
- Payback period: 7.5 years

**Test Scenarios**:
10. **ROI Inquiry**: "What's my return on investment for solar?"
11. **Deal Comparison**: "Is this a good deal compared to other options?"
12. **Community Comparison**: "How does my ROI compare to community solar?"

**Expected AI Behaviors**:
-  Reference existing ROI calculations
-  Suggest relevant comparisons and optimizations
-  Offer alternative scenarios (community solar)
-  Update user preferences based on financial focus

---

### 5. Memory & Context Retention (`memory_context`)

**Objective**: Test conversation continuity and personalization over multiple interactions.

**User Profile**:
- Name: Sarah
- 10 interactions (established user)
- Location: Bellingham, WA

**Conversation History**:
- Previous mention: 1500 sq ft house
- Previous mention: $180/month electricity bill
- Previous location context: Bellingham

**Test Scenarios**:
13. **Context Reference**: "Based on what we discussed about my house, what size system do I need?"
14. **Bill Reference**: "Remember I mentioned my $180 bill - how much could I save?"
15. **Location Callback**: "You mentioned Bellingham earlier - are there local incentives?"

**Expected AI Behaviors**:
-  Reference house size from conversation history
-  Remember and use the $180 electricity bill figure
-  Maintain location context (Bellingham)
-  Demonstrate personalization with name usage

---

### 6. Error Handling & Edge Cases (`error_handling`)

**Objective**: Test graceful handling of ambiguous, incomplete, or nonsensical inputs.

**User Profile**:
- 2 interactions (limited context)

**Test Scenarios**:
16. **Vague Input**: "solar thing"
17. **Incomplete Request**: "help me with the stuff"
18. **Ambiguous Command**: "calculate it"
19. **Empty Input**: "" (empty string)
20. **Nonsense Input**: "sdjfksldf random text"

**Expected AI Behaviors**:
-  Ask clarifying questions appropriately
-  Offer specific help options
-  Handle errors gracefully without crashing
-  Maintain helpful and professional tone
-  Guide users toward productive interactions

---

## Evaluation Metrics

Each test scenario is evaluated across multiple dimensions:

### Response Quality
- **Relevance Score** (0-1): How well the response addresses the user's query
- **Response Time** (ms): Speed of AI response generation
- **Length Appropriateness** (boolean): Whether response length matches user's expertise level

### Personalization
- **Personalization Score** (0-1): Use of user profile data (name, location, preferences)
- **Context Awareness** (0-1): Reference to conversation history and user data
- **Intent Detection** (boolean): Correct identification of user's intent

### User Experience
- **Suggestion Relevance** (boolean): Quality of follow-up suggestions
- **Behavior Compliance** (0-1): Adherence to expected behaviors for user type
- **Error Handling** (0-1): Graceful handling of problematic inputs

## Scoring System

### Individual Test Scores
- **Relevance Weight**: 30%
- **Personalization Weight**: 25%
- **Context Awareness Weight**: 25%
- **Behavior Compliance Weight**: 20%

### Overall Performance Grades
- **A+ (90-100%)**: Exceptional AI performance
- **A (80-89%)**: Excellent performance
- **B (70-79%)**: Good performance
- **C (60-69%)**: Acceptable performance
- **F (<60%)**: Needs improvement

## Test Execution

### Automated Testing Process
1. **Environment Setup**: Configure AI agent with test user profile
2. **Message Processing**: Send each test message and capture response
3. **Response Analysis**: Evaluate response quality using predefined criteria
4. **Behavior Verification**: Check expected behaviors against actual AI actions
5. **Metric Calculation**: Compute scores across all evaluation dimensions

### Success Criteria
- **Overall Score**: ≥70% (B grade minimum)
- **Category Pass Rate**: ≥70% of tests in each category
- **Response Time**: <1500ms average
- **Error Rate**: <10% of interactions

## Key Validation Points

### Critical Assumptions Tested
1. **User Understanding**: AI responses are comprehensible to target audience
2. **Workflow Intuition**: Interaction flow feels natural with minimal guidance
3. **Feedback Interpretation**: Users can understand and act on AI recommendations
4. **Interaction Affordance**: System enables expected user behaviors

### Risk Mitigation
- **Technical Complexity**: Ensure appropriate language for user expertise level
- **Context Loss**: Verify conversation continuity across interactions
- **Personalization Failure**: Test user profile utilization effectiveness
- **Error Scenarios**: Validate graceful degradation under stress conditions

## Implementation Notes

### Test Data Sources
- **User Profiles**: Simulated based on real user research
- **Conversation Histories**: Representative interaction patterns
- **Context Data**: Realistic ROI calculations and location data
- **Edge Cases**: Common user input patterns and error scenarios

### Measurement Tools
- **Automated Scoring**: Quantitative analysis of response characteristics
- **Keyword Detection**: Technical term usage appropriate to user level
- **Context Tracking**: Verification of conversation state management
- **Performance Monitoring**: Response time and error rate measurement

This comprehensive test suite provides robust validation of the AI agent's core functionality across diverse user scenarios and interaction patterns, ensuring reliable performance for the SolarEase platform's critical conversational intelligence subsystem.