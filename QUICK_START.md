# Quick Start - Nash Bargaining Negotiation Tool

## Prerequisites

- Python 3.9+ with pip
- Node.js 16+ with npm
- OpenAI API key (optional, for AI explanations)

## Setup (5 minutes)

### 1. Install Python Dependencies
```bash
cd /Users/Samar/Documents/solarease
pip install -r requirements.txt
```

### 2. Configure Environment (Optional - for AI features)
Create `.env` file in project root:
```env
OPENAI_API_KEY=sk-your-key-here
PORT=3000
```

### 3. Start Backend Server
```bash
node server/index.js
```

Server starts on `http://localhost:3000`

### 4. Start Frontend Dev Server
```bash
npm run dev
```

Frontend starts on `http://localhost:5174` (or next available port)

## Usage

### Step 1: Navigate to Tool
1. Open `http://localhost:5174` in browser
2. Scroll to **"Powerful Features for Community Empowerment"** section
3. Click on **"Negotiation Support"** card (5th card)
4. Tool appears below and page scrolls to it

### Step 2: Add Participants
1. Click **"+ Add"** button to add participants (need at least 2)
2. For each participant, fill in:
   - **Name**: e.g., "Smith Household"
   - **Address**: e.g., "123 Main St, Quincy, WA"
   - **Annual Generation (kWh)**: e.g., 12000
   - **Upfront Cost ($)**: e.g., 15000
   - **Energy Price ($/kWh)**: e.g., 0.12 (local utility rate)

### Step 3: Set PPA Terms
1. **PPA Price ($/kWh)**: e.g., 0.15 (typically higher than retail rate)
2. **PPA Term (years)**: e.g., 20
3. **Shared Costs ($)**: e.g., 2000 (coordination/admin fees)

### Step 4: Run Negotiation
1. Click **"RUN NASH BARGAINING"** button
2. Wait 2-3 seconds for computation
3. Results appear in right panel

### Step 5: Review Results
- **Total Surplus**: Total value from cooperation
- **For each participant:**
  - **Fallback (Threat Point)**: Value if they go solo
  - **Allocation**: Fair share from Nash Bargaining
  - **Gain from Cooperation**: How much better off than solo

### Step 6: Get AI Explanation (Optional)
1. Click **"🤖 Explain Fairness with AI"** button
2. AI generates plain-language explanation
3. Understand why the split is mathematically fair

## Example Scenario

### Inputs:
**Participant 1 (Smith Household):**
- Annual Generation: 12,000 kWh
- Upfront Cost: $15,000
- Energy Price: $0.12/kWh

**Participant 2 (Jones Household):**
- Annual Generation: 10,000 kWh
- Upfront Cost: $12,000
- Energy Price: $0.11/kWh

**PPA Terms:**
- PPA Price: $0.15/kWh
- Term: 20 years
- Shared Costs: $2,000

### Expected Results:
- **Total Surplus**: ~$35,850
- **Smith Allocation**: ~$17,978
- **Jones Allocation**: ~$17,873
- **Both gain**: ~$17,711 above their fallback

**Key Insight:** Both participants gain approximately the **same amount**, demonstrating Nash Bargaining's fairness - equal proportional benefit from cooperation.

## Troubleshooting

### "At least 2 participants required"
**Solution:** Add at least 2 participants with complete data (generation and upfront cost filled in)

### "Nash solver failed"
**Solution:** 
1. Check Python is installed: `python3 --version`
2. Verify dependencies: `pip list | grep cvxpy`
3. Restart backend server

### "Total surplus is less than sum of threat points"
**Solution:** 
- Increase PPA price
- Reduce shared costs
- Check participant inputs are realistic

### Backend server won't start
**Solution:**
1. Check port 3000 is available: `lsof -i :3000`
2. Kill existing process: `pkill -f "node server"`
3. Restart: `node server/index.js`

### AI explanation not working
**Solution:**
1. Check `.env` file has `OPENAI_API_KEY`
2. Verify API key is valid
3. Check backend server logs for errors

## API Testing (Advanced)

### Direct API Call
```bash
curl -X POST http://localhost:3000/api/negotiate \
  -H "Content-Type: application/json" \
  -d '{
    "participants": [
      {
        "name": "House A",
        "annual_generation_kwh": 12000,
        "energy_price_per_kwh": 0.12,
        "upfront_cost": 15000
      },
      {
        "name": "House B",
        "annual_generation_kwh": 10000,
        "energy_price_per_kwh": 0.11,
        "upfront_cost": 12000
      }
    ],
    "ppa_price": 0.15,
    "ppa_term": 20,
    "shared_costs": 2000
  }'
```

### Expected Response
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

## Files Reference

- **Backend Solver**: `server/nash_solver.py`
- **API Endpoint**: `server/index.js` → `/api/negotiate`
- **Frontend Component**: `src/components/NegotiationTool.jsx`
- **Styling**: `src/components/NegotiationTool.css`
- **Documentation**: `NEGOTIATION_TOOL.md`
- **Dependencies**: `requirements.txt`

## Support

For detailed documentation, see `NEGOTIATION_TOOL.md`
For implementation summary, see `NEGOTIATION_TOOL_SUMMARY.md`

---

**🎉 You're ready to compute fair solar allocations with Nash Bargaining!**

