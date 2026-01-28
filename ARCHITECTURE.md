# SolarEase System Architecture

## Overview
SolarEase follows a modern three-layer web architecture designed for iterative development, scalability, and maintainability. The system separates user interface (React SPA), business logic (Express.js + Python), and data processing into distinct layers that communicate through RESTful APIs.

**Current Stack:** React 18 + Vite + Express.js + Python (CVXPY)

---

## Three-Layer Architecture

### Layer 1: Presentation Layer
**React Single-Page Application (SPA)**

The user-facing dashboard built with React 18 and Vite, featuring a modern component-based architecture with client-side routing.

#### Page Structure (React Router)
- **HomePage** (`/`) - Landing page with hero section, community input form, CTA for ROI simulator, success stories carousel
- **ROI Simulator Page** (`/roi-simulator`) - Dedicated page for location selection, dual-scenario ROI analysis, financial dashboard with NPV/IRR calculations
- **Negotiation Tool Page** (`/negotiation-tool`) - Interactive Nash Bargaining interface for fair benefit allocation across community participants

#### Core Components
- **Header** - Global navigation with logo (home button) and branding
- **Hero** - Landing page hero section with background imagery and value proposition
- **InputForm** - Community characteristics input (household count, location, energy consumption)
- **LocationROI** - Washington state county selection with interactive map visualization
- **DashboardModule** - Dual-scenario financial comparison showing:
  - NPV, IRR, payback period, annual cash flow
  - Production vs consumption metrics
  - Customizable parameters (system size, cost per kW, energy price, production rate)
  - AI-powered scenario analysis with Soli
- **NegotiationTool** - Multi-participant Nash Bargaining interface:
  - Dynamic participant management (add/remove households)
  - Individual financial inputs (upfront cost, annual generation, energy prices)
  - Fair allocation calculation using Nash Bargaining solution
  - AI-powered fairness explanations
- **CTASection** - Call-to-action cards driving users to ROI simulator
- **SuccessfulCases** - Image carousel showcasing successful community solar projects
- **AIChatbot (Soli)** - Floating chatbot assistant available across all pages:
  - Persistent chat history across navigation
  - Conversational AI powered by GPT-4o-mini
  - Context-aware solar energy guidance
  - Recommended starter questions
  - Custom branding (sun icon avatar, SolarEase personality)
- **Footer** - Site-wide footer with links and information

#### Technology Stack
- **Framework:** React 18.2.0
- **Build Tool:** Vite 5.0.0
- **Routing:** React Router DOM 7.10.1
- **Styling:** Component-scoped CSS modules with gradient theme (#0da2e7, #07c0d5)
- **State Management:** React useState hooks (no external state library)
- **Font:** Poppins (Google Fonts)

---

### Layer 2: Application Layer
**Express.js Backend with Three Core Engines**

The business logic layer exposes REST API endpoints and orchestrates calculations, AI interactions, and optimization algorithms.

#### Backend Server (`server/index.js`)
- **Runtime:** Node.js with Express.js 4.18.2
- **Port:** 3000
- **CORS:** Enabled for local development
- **Environment:** `.env` file for API keys (OPENAI_API_KEY)

#### Three Core API Endpoints

**A. AI Chat Engine (`/api/chat`)**
- **Purpose:** Conversational AI assistant (Soli) for general solar energy guidance
- **Model:** OpenAI GPT-4o-mini
- **System Prompt:** Defines Soli's personality as a friendly SolarEase assistant
- **Features:**
  - Multi-turn conversational context
  - Solar energy education
  - ROI and financial metric explanations
  - Community solar guidance
  - PPA term explanations
  - max_tokens: 500, temperature: 0.7
- **Request:** `{ messages: [{role, content}] }`
- **Response:** `{ result: "AI response text" }`

**B. AI Explanation Engine (`/api/ai`)**
- **Purpose:** Quick, context-specific explanations for dashboard scenarios
- **Model:** OpenAI GPT-4o-mini
- **Use Cases:**
  - ROI scenario summaries (under 150 words)
  - Nash Bargaining fairness explanations (under 120 words)
- **Features:**
  - Conversational Soli personality
  - Context-aware prompts
  - Markdown-free natural paragraph responses
  - Personalized to user's scenario data
- **Request:** `{ prompt: "...", context: "solar energy analysis" }`
- **Response:** `{ result: "AI explanation" }`

**C. Negotiation Engine (`/api/negotiate`)**
- **Purpose:** Nash Bargaining optimization for fair benefit allocation
- **Algorithm:** Nash Bargaining Solution with cooperative game theory
- **Solver:** Python CVXPY (convex optimization library)
- **Process:**
  1. Receive participant data (upfront costs, generation, energy prices)
  2. Compute individual threat points (no-cooperation scenario NPVs)
  3. Calculate cooperative surplus (total benefit from collaboration)
  4. Solve Nash Bargaining problem: maximize product of utility gains
  5. Return fair allocation vector for each participant
- **Technology:**
  - Python subprocess execution via Node.js `spawn`
  - Architecture-specific execution (`arch -arm64 python3` for Apple Silicon)
  - JSON data exchange via stdin/stdout
- **Request:** `{ participants: [...], ppa_price, ppa_term, shared_costs, weights }`
- **Response:** `{ allocation: [x1, x2, ...], total_surplus, threat_points, status }`

#### Financial Calculation Library (`src/lib/finance.js`)
Client-side JavaScript module for real-time ROI calculations:
- **buildCashflow()** - Generates 25-year cashflow projections
  - Capital costs, annual production, revenue, OPEX (1% of capital)
- **npv()** - Net Present Value calculation with discount rate
- **irr()** - Internal Rate of Return using bisection method
- **compute_threat_point()** - Individual no-cooperation NPV
- **compute_cooperative_surplus()** - Total surplus from collaboration

---

### Layer 3: Data & Integration Layer
**External APIs, Solar Data, and Financial Models**

#### Solar Production Data (Planned Integration)
**NREL PVWatts API**
- **Purpose:** Solar production estimates by location, system size, and tilt
- **Status:** Planned integration before demo (currently using placeholder production rates)
- **Data:** kWh/kW annual production based on geographic coordinates, weather patterns, and system specifications
- **Use Case:** Will replace hardcoded production estimates in ROI calculator and provide location-specific accuracy for Washington state counties

#### Utility Rate Data (Planned Integration)
**OpenEI Database**
- **Purpose:** Real-time utility rates and local incentive programs
- **Status:** Planned integration
- **Data:** $/kWh electricity rates, state/federal incentives, net metering policies
- **Use Case:** Accurate pricing for ROI calculations and scenario comparisons

#### Current Data Management
- **State:** Client-side React state (useState hooks)
  - Location selection (county names)
  - Simulation parameters (size, costs, prices, production rates)
  - Negotiation participants array
  - Chat history (persists across route navigation)
  - Dashboard flash animations and loading states
- **Session Persistence:** Browser memory only (no database in MVP)
- **External API Calls:**
  - OpenAI GPT-4o-mini (chat completions endpoint)
  - Future: NREL PVWatts, OpenEI

#### Planned Database (Production)
- **MVP:** SQLite (file-based, no server configuration)
- **Production:** PostgreSQL (multi-user, scalable)
- **Storage:**
  - User sessions and scenario history
  - Saved community profiles
  - Negotiation results
  - AI interaction logs for analytics

---

## Data Flow

### Typical User Journey

1. **Landing Page (`/`)**
   - User views hero section and community input form
   - Browses success stories carousel
   - Clicks CTA button to start ROI analysis

2. **ROI Simulator (`/roi-simulator`)**
   - User selects Washington county from interactive map
   - System displays dual-scenario comparison (Scenario A vs B)
   - User adjusts parameters:
     - System size (kW)
     - Cost per kW
     - Energy price ($/kWh)
     - Production rate (kWh/kW/year) - *Will be auto-populated via NREL PVWatts API*
   - Client-side JavaScript calculates NPV, IRR, payback period in real-time
   - User triggers "Generate AI Summary" button
   - Frontend sends scenario data to `/api/ai` endpoint
   - Backend calls OpenAI GPT-4o-mini with conversational prompt
   - Soli analyzes scenarios in friendly tone (under 150 words)
   - AI response displayed with formatted paragraphs, no markdown symbols

3. **Negotiation Tool (`/negotiation-tool`)**
   - User adds multiple participants (households)
   - For each participant, enters:
     - Upfront cost contribution
     - Annual generation (kWh)
     - Current energy price ($/kWh)
     - Discount rate
   - User clicks "Run Nash Negotiation"
   - Frontend sends participant array to `/api/negotiate` endpoint
   - Backend spawns Python subprocess
   - Python CVXPY solver:
     1. Computes threat points (individual NPVs without cooperation)
     2. Calculates cooperative surplus (total benefit from PPA)
     3. Solves Nash Bargaining optimization (maximize product of utility gains)
   - Python returns allocation vector via JSON stdout
   - Backend forwards results to frontend
   - Dashboard displays fair allocation for each participant
   - User clicks "Explain Fairness with AI"
   - Frontend sends results to `/api/ai`
   - Soli explains Nash Bargaining outcome in 2-3 short paragraphs

4. **AI Chat Assistant (All Pages)**
   - User clicks floating sun icon button (bottom-right)
   - Chat window slides up with recommended questions
   - User types question or selects recommendation
   - Frontend sends message history to `/api/chat` endpoint
   - Backend maintains conversational context with GPT-4o-mini
   - Soli responds with solar energy guidance, financial explanations, or policy information
   - Chat history persists across page navigation (React Router)

---

## API Communication Patterns

### REST Endpoints
All APIs use JSON request/response format with CORS enabled.

**POST `/api/chat`**
```json
Request: {
  "messages": [
    {"role": "user", "content": "How does NPV work?"},
    {"role": "assistant", "content": "..."}
  ]
}
Response: {
  "result": "NPV (Net Present Value) is..."
}
```

**POST `/api/ai`**
```json
Request: {
  "prompt": "Compare these two solar scenarios: Scenario A has NPV $45,230...",
  "context": "ROI scenario analysis"
}
Response: {
  "result": "These scenarios show a clear advantage for Scenario A..."
}
```

**POST `/api/negotiate`**
```json
Request: {
  "participants": [
    {
      "name": "Household 1",
      "upfront_cost": 12000,
      "annual_generation_kwh": 8500,
      "energy_price_per_kwh": 0.12,
      "discount_rate": 0.06,
      "years": 25
    },
    {...}
  ],
  "ppa_price": 0.15,
  "ppa_term": 20,
  "shared_costs": 5000,
  "weights": null
}
Response: {
  "allocation": [23450.50, 18320.25, 15890.75],
  "total_surplus": 57661.50,
  "threat_points": [-12000, -10500, -9200],
  "status": "optimal"
}
```

---

## Key Integration Points

1. **Frontend ↔ Backend API**
   - Protocol: HTTP REST with JSON payloads
   - CORS: Enabled for `http://localhost:5173` (Vite dev server)
   - Async: JavaScript `fetch()` with `async/await`
   - Error Handling: Try-catch blocks with user-friendly error messages

2. **Backend ↔ OpenAI API**
   - Protocol: HTTPS POST to `https://api.openai.com/v1/chat/completions`
   - Authentication: Bearer token (`OPENAI_API_KEY` from `.env`)
   - Model: `gpt-4o-mini`
   - Rate Limits: 500 max_tokens per request
   - System Prompts: Define Soli personality and response constraints

3. **Backend ↔ Python CVXPY**
   - IPC: Node.js `spawn()` subprocess
   - Data Exchange: JSON via stdin (input) and stdout (output)
   - Architecture: `arch -arm64 python3` for Apple Silicon compatibility
   - Script: Inline Python code executed with `-c` flag
   - Error Handling: stderr capture and JSON error responses

4. **Frontend ↔ React Router**
   - Client-side routing (no server requests for navigation)
   - Shared state via AIChatbot component at root level
   - Browser history API for back/forward navigation

5. **Planned: Frontend ↔ NREL PVWatts API**
   - Protocol: HTTP GET requests with location parameters
   - Data: Solar production estimates (kWh/kW/year)
   - Usage: Auto-populate production rates in ROI simulator based on selected county
   - Fallback: Default production values if API unavailable

6. **Planned: Frontend ↔ OpenEI Database**
   - Protocol: HTTP GET for utility rate lookup
   - Data: $/kWh rates by utility territory and tariff structure
   - Usage: Accurate energy pricing in ROI calculations

---

## Technology Stack Summary

### Frontend
- **React:** 18.2.0
- **Vite:** 5.0.0 (build tool, dev server)
- **React Router DOM:** 7.10.1
- **Styling:** Custom CSS modules (no frameworks)
- **State:** React hooks (useState)

### Backend
- **Node.js:** Express.js 4.18.2
- **CORS:** 2.8.5
- **Environment:** dotenv 16.0.3
- **HTTP Client:** node-fetch 2.6.7

### AI/ML
- **OpenAI API:** GPT-4o-mini
- **Python:** CVXPY (convex optimization)
- **NumPy:** Array operations for Python solver

### External APIs (Planned)
- **NREL PVWatts API:** Solar production data
- **OpenEI Database:** Utility rates and incentives

### Development Tools
- **Version Control:** Git (GitHub: samar1409/microgrid)
- **Package Manager:** npm
- **Deployment:** Vite build → static hosting
- **Backend Hosting:** Node.js server (port 3000)

---

## Deployment Architecture (Future)

### Frontend
- **Build:** `npm run build` → static files in `dist/`
- **Hosting:** Vercel, Netlify, or AWS S3 + CloudFront
- **CDN:** Global edge distribution for fast load times

### Backend
- **Hosting:** AWS EC2, Heroku, or Railway.app
- **Environment:** Production `.env` with secure API keys
- **Process Manager:** PM2 for Node.js uptime

### Python Dependencies
- **Containerization:** Docker image with Python 3.11, CVXPY, NumPy
- **Execution:** Backend spawns containerized Python processes

### Database (When Implemented)
- **Staging:** SQLite file-based
- **Production:** PostgreSQL on AWS RDS or Supabase
- **Migrations:** Prisma or raw SQL scripts

---

## Security Considerations

1. **API Keys:** Stored in `.env` (never committed to Git)
2. **CORS:** Restricted to specific frontend origin in production
3. **Input Validation:** Participant count, numeric bounds, required fields
4. **Rate Limiting:** Planned for OpenAI API calls (prevent abuse)
5. **HTTPS:** All production traffic encrypted
6. **Environment Variables:** Separate dev/staging/production configs

---

## Future Enhancements

1. **NREL PVWatts Integration:** Replace hardcoded production rates with API data
2. **OpenEI Utility Rates:** Real-time pricing by location
3. **Database Persistence:** Save user scenarios and community profiles
4. **Authentication:** User accounts for saved sessions
5. **Advanced Negotiation:** Multi-PPA comparison, custom fairness weights
6. **Mobile Optimization:** Responsive design improvements
7. **Analytics:** Track user interactions, popular scenarios
8. **Export Features:** PDF reports for community presentations
9. **Multi-state Support:** Expand beyond Washington state
10. **Real-time Collaboration:** Multiple users negotiating simultaneously
