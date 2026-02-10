# SolarEase Negotiation Tool

## Overview

The **Negotiation Tool** implements **Nash Bargaining** to compute fair allocations of cooperative surplus among multiple households or communities participating in aggregated solar deals.

## Concept

Nash Bargaining uses each participant's **threat point** (their minimum payoff if they don't cooperate) to compute a fair and stable allocation of the total cooperative surplus.

### Key Elements

1. **Threat Point (dᵢ)**: The estimated value a participant can receive if they do not join the collaborative deal
   - Derived from standalone ROI, local utility rates, installation costs
   - Represents the fallback option for each participant

2. **Total Surplus (S)**: The extra value generated when participants cooperate
   - Comes from aggregated PPA deals, bulk pricing, shared costs
   - Total value available for distribution

3. **Fair Allocation (uᵢ)**: The Nash solution that maximizes fairness
   - Solves: `maximize Σ log(uᵢ − dᵢ)`
   - Subject to: `Σ uᵢ = S` and `uᵢ ≥ dᵢ`
   - Ensures each participant gains proportionally over their fallback

## Architecture

### Backend: Python Nash Solver (`server/nash_solver.py`)

**Core Functions:**

1. `nash_bargaining_solver(threat_points, total_surplus, weights=None)`
   - Implements CVXPY optimization
   - Returns allocations, gains, and solver status
   - Handles edge cases (infeasible, suboptimal)

2. `compute_threat_point(annual_generation_kwh, energy_price_per_kwh, upfront_cost, ...)`
   - Calculates standalone solar ROI
   - Converts NPV to annualized threat point value
   - Returns max(0, annualized_benefit)

3. `compute_cooperative_surplus(participants_data, ppa_price_per_kwh, ppa_term_years, shared_costs)`
   - Aggregates total generation across participants
   - Computes PPA revenue over contract term
   - Subtracts shared costs to get net surplus

**Mathematical Model:**

```
maximize  Σᵢ wᵢ * log(uᵢ − dᵢ)
subject to:
    Σᵢ uᵢ = S              (allocate all surplus)
    uᵢ ≥ dᵢ  ∀i           (individual rationality)
```

Where:
- `uᵢ` = allocation for participant i
- `dᵢ` = threat point (fallback) for participant i  
- `S` = total cooperative surplus
- `wᵢ` = optional weights (default: equal)

### Backend: Express API Endpoint (`server/index.js`)

**Endpoint:** `POST /api/negotiate`

**Request Body:**
```json
{
  "participants": [
    {
      "name": "Household 1",
      "address": "123 Main St",
      "annual_generation_kwh": 12000,
      "energy_price_per_kwh": 0.12,
      "upfront_cost": 15000,
      "discount_rate": 0.06,
      "years": 25
    },
    ...
  ],
  "ppa_price": 0.15,
  "ppa_term": 20,
  "shared_costs": 5000,
  "weights": null  // optional
}
```

**Response:**
```json
{
  "allocations": [7000.01, 9999.99, 8000.00],
  "gains": [2000.01, 1999.99, 2000.00],
  "threat_points": [5000, 8000, 6000],
  "total_surplus": 25000,
  "status": "optimal",
  "participants": [
    {
      "name": "Household 1",
      "address": "123 Main St",
      "annual_generation_kwh": 12000,
      "threat_point": 5000,
      "allocation": 7000.01,
      "gain": 2000.01
    },
    ...
  ]
}
```

### Frontend: React Component (`src/components/NegotiationTool.jsx`)

**Features:**

1. **Multi-Participant Input Form**
   - Dynamic add/remove participants (minimum 2)
   - Per-participant fields: name, address, generation, costs, energy price
   - PPA terms: price, term, shared costs

2. **Results Visualization**
   - Allocation cards showing threat point, allocation, and gain
   - Progress bars indicating share of total surplus
   - Visual emphasis on gains from cooperation

3. **AI Explanation**
   - Button to generate fairness explanation via OpenAI
   - Plain-language summary of why the split is equitable
   - Emphasizes Nash Bargaining principles

4. **Navigation**
   - Triggered from "Negotiation Support" feature card
   - Smooth scroll to tool section
   - Conditional rendering (shows when clicked)

## Flow

### Step 1: User Input
- User adds participants with location and solar specs
- User enters PPA terms (price, term, shared costs)

### Step 2: Threat Point Calculation
- Backend computes each participant's standalone ROI
- Converts NPV to annualized value → threat point

### Step 3: Cooperative Surplus Calculation
- Aggregates total generation across all participants
- Applies PPA pricing and term
- Subtracts shared costs → total surplus

### Step 4: Nash Bargaining Solver
- CVXPY solves convex optimization problem
- Returns fair allocations maximizing Nash product

### Step 5: Results Display
- Frontend visualizes allocations
- Shows threat points, allocations, gains
- Highlights proportional benefit distribution

### Step 6: AI Explanation (Optional)
- User clicks "Explain Fairness with AI"
- System generates plain-language explanation
- Helps participants understand why split is fair

## Installation

### Python Dependencies
```bash
pip install -r requirements.txt
```

Required packages:
- `cvxpy>=1.3.0` - Convex optimization library
- `numpy>=1.24.0` - Numerical computing

### Node Dependencies
Already included in project's `package.json`.

## Usage

### 1. Start Backend Server
```bash
node server/index.js
```
Server runs on `http://localhost:3000`

### 2. Navigate to Negotiation Tool
- Click "Negotiation Support" card in Features section
- Tool appears below Successful Cases section

### 3. Add Participants
- Click "+ Add" to add participants (min 2 required)
- Fill in generation, costs, and energy prices

### 4. Set PPA Terms
- Enter PPA price ($/kWh), typically > retail rate
- Enter contract term (years)
- Enter shared coordination costs ($)

### 5. Run Nash Bargaining
- Click "Run Nash Bargaining" button
- Backend computes threat points and surplus
- Solver returns fair allocations

### 6. Review Results
- See each participant's allocation
- Compare to threat points (fallback)
- View gains from cooperation

### 7. Get AI Explanation (Optional)
- Click "🤖 Explain Fairness with AI"
- AI generates explanation of why split is fair

## Testing

### Test Nash Solver Directly
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

## Design Principles

### Fairness Criteria
Nash Bargaining ensures:
1. **Individual Rationality**: Each participant gets at least their threat point
2. **Pareto Efficiency**: No reallocation can benefit one without harming another
3. **Symmetry**: Identical participants receive identical allocations
4. **Independence of Irrelevant Alternatives**: Removing options doesn't change existing allocations

### Why Nash Bargaining?
- **Mathematically proven** fair allocation method
- **Game theory foundation** - stable equilibrium
- **Transparent and explainable** - based on objective metrics
- **Flexible** - can incorporate participant weights if needed

## Troubleshooting

### "Solver failed with status: infeasible"
**Cause:** Total surplus < sum of threat points  
**Solution:** Increase PPA price, reduce shared costs, or check participant inputs

### "At least 2 participants required"
**Cause:** Less than 2 participants with complete data  
**Solution:** Add more participants or complete all required fields

### Python import errors
**Cause:** Missing dependencies  
**Solution:** Run `pip install -r requirements.txt`

### "Nash solver failed"
**Cause:** Python process error  
**Solution:** Check Python3 is installed, verify `nash_solver.py` path is correct

## Future Enhancements

1. **Weighted Allocations**: Allow users to specify negotiation power/weights
2. **Constraint Customization**: Add minimum/maximum allocation bounds per participant
3. **Historical Tracking**: Save and compare negotiation scenarios
4. **Multi-Objective Optimization**: Balance fairness with other criteria (environmental impact, equity)
5. **Interactive Visualization**: Charts showing allocation sensitivity to parameters
6. **Export Reports**: PDF summaries of negotiation results for stakeholders

## References

- Nash, J. (1950). "The Bargaining Problem." *Econometrica*, 18(2), 155-162.
- Boyd, S., & Vandenberghe, L. (2004). *Convex Optimization*. Cambridge University Press.
- CVXPY Documentation: https://www.cvxpy.org/

