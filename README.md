# SolarEase - Community Solar Investment Platform

**Empowering local communities to make informed, collective decisions about solar energy investments.**

**[Live Demo](https://gix-solarease.com)**

## Overview

SolarEase is a comprehensive web application that helps communities:
- **Analyze ROI** for solar projects with transparent, data-driven projections
- **Negotiate fairly** with corporate energy buyers using Nash Bargaining
- **Visualize impact** across regions with interactive mapping
- **Collaborate** on joint projects to maximize collective benefit
- **Understand** complex energy economics through AI-powered explanations

---

## Features

###  **ROI Simulator**
- Visualize costs, benefits, and payback periods
- NPV and IRR calculations with cashflow projections
- Customizable parameters (size, cost, energy prices)
- Scenario comparison (baseline vs. what-if)

###  **Nash Bargaining Negotiation Tool** 
- **Fair allocation** of cooperative surplus among participants
- **Game theory-based** optimization (CVXPY solver)
- **Threat point calculation** from standalone ROI
- **AI-powered explanations** of why splits are fair
- Interactive multi-participant input interface

[Read more: NEGOTIATION_TOOL.md](./NEGOTIATION_TOOL.md)

###  **AI Assistant**
- Plain-language explanations via OpenAI API
- Real-time Q&A about energy economics, policy, technical terms
- Project-specific recommendations

###  **Regional Impact Visualization**
- Interactive location cards with metrics
- Community-level solar potential analysis
- Comparative statistics across regions

###  **Collaboration Tools**
- Multi-community ROI simulation
- Joint project opportunity discovery
- Complementary energy profile analysis

###  **Contract Transparency**
- **AI-powered contract analysis** for PPA documents
- **Plain-language summaries** explaining what agreements mean
- **Key term extraction**: parties, term length, capacity, pricing, escalation rates
- **Risk flag identification** with severity ratings (High/Medium/Low)
- **Drag-and-drop upload** for PDF and TXT files
- **Legal disclaimer** reminding users to consult attorneys

---

## Architecture

### Frontend
- **Framework**: React (functional components)
- **Build Tool**: Vite
- **Styling**: CSS modules with blue gradient theme
- **Components**:
  - `Header`, `Hero`, `InputForm` (feature grid)
  - `LocationROI` (location selector + quick ROI)
  - `DashboardModule` (full simulator with charts)
  - `NegotiationTool` (Nash Bargaining interface)
  - `Pagination` (Regional Impact Map)
  - `SuccessfulCases` (carousel)
  - `Footer`

### Backend
- **Server**: Express.js (Node)
- **AI Integration**: OpenAI or Azure OpenAI (configurable)
- **Contract Analysis**: PDF parsing with AI-powered extraction
- **Negotiation Endpoint**: `/api/negotiate` (Python subprocess)
- **Nash Solver**: CVXPY-based convex optimization

### Financial Engine
- **Library**: `src/lib/finance.js`
- **Functions**: 
  - `buildCashflow()` - Multi-year projections with O&M
  - `npv()` - Net Present Value calculator
  - `irr()` - Internal Rate of Return solver
  - `compute_threat_point()` - Fallback value for Nash Bargaining
  - `compute_cooperative_surplus()` - Aggregated deal value

---

## Installation

### Prerequisites
- **Node.js** 16+ with npm
- **Python** 3.9+ with pip
- **OpenAI API Key** (optional, for AI features)

### Setup

1. **Clone repository**
   ```bash
   cd /path/to/solarease
   ```

2. **Install Node dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```
   Dependencies:
   - `cvxpy>=1.3.0` - Convex optimization
   - `numpy>=1.24.0` - Numerical computing

4. **Configure environment** (optional)

   Create `.env` file in project root:
   ```env
   # Option 1: OpenAI
   OPENAI_API_KEY=sk-your-key-here

   # Option 2: Azure OpenAI (takes priority if all are set)
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_KEY=your-azure-key
   AZURE_OPENAI_DEPLOYMENT=your-deployment-name
   AZURE_OPENAI_API_VERSION=2024-02-15-preview

   PORT=3000
   ```

5. **Start backend server**
   ```bash
   node server/index.js
   ```
   Server runs on `http://localhost:3000`

6. **Start frontend dev server**
   ```bash
   npm run dev
   ```
   App runs on `http://localhost:5173` (or next available port)

---

## Usage

### Basic ROI Analysis

1. Navigate to **"Ready to transform your community's energy future"** section
2. Select a location (Quincy, East Wenatchee, Malaga, or Yakima)
3. View quick ROI metrics (payback period, NPV, IRR)
4. Adjust inputs (capacity, cost, energy price)
5. Click **"Run Full Simulation"** for detailed dashboard
6. Explore cashflow projections, scenario comparison, AI explanations

### Nash Bargaining Negotiation

1. Click **"Negotiation Support"** in Features section
2. Add 2+ participants with:
   - Annual solar generation (kWh)
   - Upfront installation cost ($)
   - Local energy price ($/kWh)
3. Set PPA terms:
   - PPA price ($/kWh, typically > retail)
   - Contract term (years)
   - Shared coordination costs ($)
4. Click **"Run Nash Bargaining"**
5. Review fair allocations:
   - Each participant's threat point (fallback)
   - Fair allocation from Nash solution
   - Gain from cooperation
6. Optional: Click **"Explain Fairness with AI"** for detailed explanation

[Detailed guide: QUICK_START.md](./QUICK_START.md)

---

## API Endpoints

### `POST /api/ai`
Generate AI explanations and recommendations.

**Request:**
```json
{
  "prompt": "Explain the NPV calculation for a 100kW solar project..."
}
```

**Response:**
```json
{
  "result": "NPV (Net Present Value) represents..."
}
```

### `POST /api/analyze-contract`
Analyze a PPA contract document and extract key terms and risk flags.

**Request:** `multipart/form-data` with file field `contract`
- Accepts: PDF, TXT files (max 10MB)

**Response:**
```json
{
  "summary": "This is a 20-year PPA between...",
  "keyTerms": {
    "parties": { "buyer": "Acme Corp", "seller": "Solar Provider Inc" },
    "termLength": "20 years",
    "capacity": "500 kW",
    "pricePerKwh": "$0.12",
    "escalationRate": "2% annually",
    "performanceGuarantee": "90% system uptime",
    "omResponsibility": "Seller maintains system",
    "terminationClause": "30-day notice required"
  },
  "riskFlags": [
    {
      "severity": "high",
      "term": "Escalation Rate",
      "issue": "3% annual escalation exceeds typical 1-2%",
      "section": "Section 4.2"
    }
  ],
  "disclaimer": "This analysis is informational only..."
}
```

### `POST /api/negotiate`
Compute fair allocations using Nash Bargaining.

**Request:**
```json
{
  "participants": [
    {
      "name": "Household A",
      "annual_generation_kwh": 12000,
      "energy_price_per_kwh": 0.12,
      "upfront_cost": 15000
    },
    ...
  ],
  "ppa_price": 0.15,
  "ppa_term": 20,
  "shared_costs": 2000
}
```

**Response:**
```json
{
  "allocations": [17978.03, 17872.71],
  "gains": [17711.43, 17711.43],
  "threat_points": [266.60, 161.28],
  "total_surplus": 35850.74,
  "status": "optimal",
  "participants": [...]
}
```

---

## Project Structure

```
solarease/
├── src/
│   ├── components/
│   │   ├── Header.jsx/css              # Site header with branding
│   │   ├── Hero.jsx/css                # Hero section with stats
│   │   ├── InputForm.jsx/css           # Features grid (6 cards)
│   │   ├── LocationROI.jsx/css         # Location selector + quick ROI
│   │   ├── DashboardModule.jsx/css     # Full simulator with charts
│   │   ├── NegotiationTool.jsx/css     # Nash Bargaining interface
│   │   ├── ContractTransparency.jsx/css # Contract analysis interface
│   │   ├── Pagination.jsx/css          # Regional Impact Map
│   │   ├── SuccessfulCases.jsx/css     # Project carousel
│   │   └── Footer.jsx/css              # Site footer
│   ├── pages/
│   │   ├── HomePage.jsx/css            # Main page composition
│   │   ├── NegotiationToolPage.jsx/css # Negotiation tool page
│   │   └── ContractTransparencyPage.jsx/css # Contract analysis page
│   └── lib/
│       └── finance.js                  # Financial calculations (NPV, IRR, cashflow)
├── server/
│   ├── index.js                    # Express API server (OpenAI/Azure OpenAI)
│   └── nash_solver.py              # CVXPY Nash Bargaining solver
├── svg/                            # Feature icons
├── requirements.txt                # Python dependencies
├── package.json                    # Node dependencies
├── vite.config.js                  # Vite configuration
├── .env.example                    # Environment template
├── NEGOTIATION_TOOL.md             # Nash Bargaining documentation
├── NEGOTIATION_TOOL_SUMMARY.md     # Implementation summary
├── QUICK_START.md                  # Quick start guide
└── README.md                       # This file
```

---

## Technologies

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **CSS** - Per-component styling with CSS variables
- **Fetch API** - Backend communication

### Backend
- **Express.js** - Web server
- **Node.js** - Runtime
- **Python** - Nash Bargaining solver

### Libraries
- **CVXPY** - Convex optimization (Nash Bargaining)
- **NumPy** - Numerical computing (threat points, surplus)
- **OpenAI API** / **Azure OpenAI** - AI explanations and contract analysis
- **pdf-parse** - PDF text extraction for contract analysis
- **multer** - File upload handling

### Design System
- **Blue Gradient Theme**: `rgba(13,162,231)` + `rgba(7,192,213)`
- **Typography**: Poppins (headings), system fonts (body)
- **Layout**: Max-width 1200px, centered sections
- **Animations**: CSS keyframes for loading, flash effects

---

## Key Concepts

### Nash Bargaining
A game theory solution concept that finds the **fairest** allocation of cooperative surplus. It ensures:
1. **Individual Rationality**: Each participant gets ≥ their fallback (threat point)
2. **Pareto Efficiency**: No reallocation can benefit one without harming another
3. **Symmetry**: Identical participants get identical shares
4. **Proportional Gains**: Each participant gains proportionally over their fallback

**Mathematical Formulation:**
```
maximize  Σᵢ log(uᵢ − dᵢ)    [Nash product in log form]

subject to:
    Σᵢ uᵢ = S              [Allocate all surplus]
    uᵢ ≥ dᵢ  ∀i            [Individual rationality]
```

### Threat Point
The **fallback value** a participant can guarantee by acting alone (not cooperating). In SolarEase:
- Computed from **standalone ROI** (solo solar installation)
- Based on **NPV** over project lifetime
- **Annualized** for fair comparison

### Cooperative Surplus
The **extra value** created when participants cooperate vs. acting alone. In SolarEase:
- Comes from **aggregated PPA deals** (higher price, better terms)
- **Bulk pricing** discounts
- **Shared costs** (coordination, admin)
- Formula: `Total PPA Revenue - Sum of Threat Points - Shared Costs`

---

## Testing

### Test Nash Solver Standalone
```bash
python3 server/nash_solver.py
```

Expected output:
```
Testing Nash Bargaining Solver

Status: optimal
Total Surplus: $25,000.00

Participant 1:
  Threat Point: $5,000.00
  Allocation: $7,000.01
  Gain: $2,000.01 (40.0% above fallback)
...
```

### Test API Endpoint
```bash
curl -X POST http://localhost:3000/api/negotiate \
  -H "Content-Type: application/json" \
  -d '{
    "participants": [
      {"annual_generation_kwh": 12000, "energy_price_per_kwh": 0.12, "upfront_cost": 15000},
      {"annual_generation_kwh": 10000, "energy_price_per_kwh": 0.11, "upfront_cost": 12000}
    ],
    "ppa_price": 0.15,
    "ppa_term": 20,
    "shared_costs": 2000
  }'
```

### Test Frontend
1. Start both servers (Node + Vite)
2. Open `http://localhost:5173` in browser
3. Click through features:
   - Select locations in ROI section
   - Run full simulations
   - Click Negotiation Support
   - Add participants and run Nash Bargaining
   - Generate AI explanations

---

## Troubleshooting

### Python Architecture Issues (Apple Silicon)
**Problem:** `ImportError: incompatible architecture (have 'arm64', need 'x86_64')`

**Solution:** Ensure using arm64 Python:
```bash
arch -arm64 python3 -m pip install --no-cache-dir numpy cvxpy
```

Server already configured to spawn `arch -arm64 python3` for compatibility.

### Port Already in Use
**Problem:** `Port 3000 is in use`

**Solution:**
```bash
lsof -i :3000          # Find process using port
kill -9 <PID>          # Kill process
node server/index.js   # Restart server
```

### Nash Solver Returns "infeasible"
**Problem:** `Total surplus is less than sum of threat points`

**Solution:**
- Increase PPA price (make cooperation more attractive)
- Reduce shared costs
- Check participant inputs are realistic (not inflated costs)

---

## Future Enhancements

### Short-term
- [ ] Participant weights for unequal negotiation power
- [ ] Save/load negotiation scenarios
- [ ] Export PDF reports
- [ ] Allocation breakdown charts

### Medium-term
- [ ] Multi-objective optimization (fairness + environment)
- [ ] Sensitivity analysis visualizations
- [ ] Historical negotiation tracking (database)
- [ ] Email notifications for participants

### Long-term
- [ ] Real-time collaboration (WebSockets)
- [ ] Blockchain integration for immutable records
- [ ] Advanced PPA modeling (time-of-use, demand charges)
- [ ] ML-based coalition structure prediction

---

## Documentation

- **[NEGOTIATION_TOOL.md](./NEGOTIATION_TOOL.md)** - Comprehensive Nash Bargaining guide
- **[NEGOTIATION_TOOL_SUMMARY.md](./NEGOTIATION_TOOL_SUMMARY.md)** - Implementation summary
- **[QUICK_START.md](./QUICK_START.md)** - Quick start guide with examples
- **[.env.example](./.env.example)** - Environment variable template

---

## References

### Game Theory
- Nash, J. (1950). "The Bargaining Problem." *Econometrica*, 18(2), 155-162.

### Convex Optimization
- Boyd, S., & Vandenberghe, L. (2004). *Convex Optimization*. Cambridge University Press.
- CVXPY Documentation: https://www.cvxpy.org/

### Solar Economics
- NREL Solar Resource Data: https://www.nrel.gov/
- DSIRE Incentive Database: https://www.dsireusa.org/

---

## License

MIT License - See LICENSE file for details

---

## Contact

For questions, issues, or contributions, please open an issue on the project repository.

---

**Built with love for communities investing in solar energy.**

