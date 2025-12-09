"""
Nash Bargaining Solver using CVXPY
Computes fair allocation of cooperative surplus among participants
"""
import cvxpy as cp
import numpy as np

def nash_bargaining_solver(threat_points, total_surplus, weights=None):
    """
    Solve Nash Bargaining problem to find fair allocation
    
    Args:
        threat_points: list/array of threat points [d₁, d₂, ..., dₙ]
        total_surplus: total cooperative value S to be allocated
        weights: optional weights for each participant (default: equal weights)
    
    Returns:
        dict with:
            - allocations: list of fair allocations [u₁, u₂, ..., uₙ]
            - gains: list of gains over fallback [u₁-d₁, u₂-d₂, ...]
            - status: solver status
            - objective_value: Nash product value
    """
    n = len(threat_points)
    threat_points = np.array(threat_points)
    
    # Default to equal weights if not provided
    if weights is None:
        weights = np.ones(n)
    else:
        weights = np.array(weights)
    
    # Validate inputs
    if total_surplus < np.sum(threat_points):
        return {
            'error': 'Total surplus is less than sum of threat points - cooperation not beneficial',
            'allocations': threat_points.tolist(),
            'gains': [0] * n,
            'status': 'infeasible'
        }
    
    # Decision variables: allocations for each participant
    u = cp.Variable(n)
    
    # Objective: maximize weighted sum of log gains
    # Nash product: Π(uᵢ - dᵢ)^wᵢ → log: Σ wᵢ * log(uᵢ - dᵢ)
    objective = cp.Maximize(cp.sum(cp.multiply(weights, cp.log(u - threat_points))))
    
    # Constraints
    constraints = [
        cp.sum(u) == total_surplus,  # Allocate all surplus
        u >= threat_points + 1e-6    # Each participant gets at least their threat point (small epsilon for numerical stability)
    ]
    
    # Solve the problem
    problem = cp.Problem(objective, constraints)
    
    try:
        problem.solve(solver=cp.SCS, verbose=False)
        
        if problem.status not in ['optimal', 'optimal_inaccurate']:
            return {
                'error': f'Solver failed with status: {problem.status}',
                'allocations': threat_points.tolist(),
                'gains': [0] * n,
                'status': problem.status
            }
        
        allocations = u.value.tolist()
        gains = (u.value - threat_points).tolist()
        
        return {
            'allocations': allocations,
            'gains': gains,
            'threat_points': threat_points.tolist(),
            'total_surplus': total_surplus,
            'status': problem.status,
            'objective_value': problem.value,
            'weights': weights.tolist()
        }
        
    except Exception as e:
        return {
            'error': f'Solver exception: {str(e)}',
            'allocations': threat_points.tolist(),
            'gains': [0] * n,
            'status': 'error'
        }


def compute_threat_point(annual_generation_kwh, energy_price_per_kwh, upfront_cost, discount_rate=0.06, years=25):
    """
    Compute threat point for a single household based on standalone solar ROI
    
    Args:
        annual_generation_kwh: Expected annual solar generation
        energy_price_per_kwh: Local utility rate ($/kWh)
        upfront_cost: Total installation cost ($)
        discount_rate: Discount rate for NPV
        years: Analysis period
    
    Returns:
        Threat point value (annualized net benefit)
    """
    annual_savings = annual_generation_kwh * energy_price_per_kwh
    
    # Simple NPV calculation
    pv_savings = sum(annual_savings / ((1 + discount_rate) ** t) for t in range(1, years + 1))
    npv = pv_savings - upfront_cost
    
    # Annualize the NPV to get annual equivalent value (threat point)
    # Using annuity formula: annualized = NPV * (r * (1+r)^n) / ((1+r)^n - 1)
    if discount_rate > 0:
        annualized = npv * (discount_rate * (1 + discount_rate) ** years) / ((1 + discount_rate) ** years - 1)
    else:
        annualized = npv / years
    
    # Threat point is the positive value they can guarantee alone
    return max(0, annualized)


def compute_cooperative_surplus(participants_data, ppa_price_per_kwh, ppa_term_years, shared_costs=0):
    """
    Compute total cooperative surplus from aggregated deal
    
    Args:
        participants_data: list of dicts with 'annual_generation_kwh' for each participant
        ppa_price_per_kwh: PPA contract price ($/kWh) - typically higher than retail
        ppa_term_years: PPA contract term
        shared_costs: Fixed shared costs for coordination/admin ($)
    
    Returns:
        Total cooperative value (present value)
    """
    # Aggregate total generation
    total_annual_generation = sum(p['annual_generation_kwh'] for p in participants_data)
    
    # Revenue from PPA over term
    annual_ppa_revenue = total_annual_generation * ppa_price_per_kwh
    
    # Simple present value calculation (can be enhanced with proper discount rate)
    discount_rate = 0.06
    pv_revenue = sum(annual_ppa_revenue / ((1 + discount_rate) ** t) for t in range(1, ppa_term_years + 1))
    
    # Subtract shared costs
    total_value = pv_revenue - shared_costs
    
    return max(0, total_value)


if __name__ == '__main__':
    # Example test case
    print("Testing Nash Bargaining Solver\n")
    
    # Three households with different threat points
    threat_points = [5000, 8000, 6000]  # Annual fallback values
    total_surplus = 25000  # Total value from cooperative deal
    
    result = nash_bargaining_solver(threat_points, total_surplus)
    
    print(f"Status: {result['status']}")
    print(f"Total Surplus: ${total_surplus:,.2f}\n")
    
    for i, (alloc, gain, threat) in enumerate(zip(result['allocations'], result['gains'], result['threat_points'])):
        print(f"Participant {i+1}:")
        print(f"  Threat Point: ${threat:,.2f}")
        print(f"  Allocation: ${alloc:,.2f}")
        print(f"  Gain: ${gain:,.2f} ({(gain/threat*100):.1f}% above fallback)")
        print()
