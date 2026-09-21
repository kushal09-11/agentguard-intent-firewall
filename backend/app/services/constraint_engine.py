"""Constraint Violation Engine for AgentGuard.
Extracts and validates explicit constraints (budget limits, hardware specs, domain boundaries).
Produces structured violation reports with expected vs actual values and severity levels.
"""
import re
from typing import Any, Dict, List, Optional


def _extract_price(action: Dict[str, Any]) -> Optional[float]:
    params = action.get("parameters", {})
    for key in ("price", "max_price", "amount", "budget", "cost"):
        val = params.get(key)
        if isinstance(val, (int, float)) and not isinstance(val, bool):
            return float(val)
        if isinstance(val, str):
            clean = val.replace(",", "").replace("₹", "").replace("$", "").strip()
            try:
                return float(clean)
            except ValueError:
                pass

    # Extract price from target or reason text (e.g., "₹85,000", "85k")
    combined = f"{action.get('target', '')} {action.get('reason', '')}".lower()
    m = re.search(r"(?:₹|rs\.?|inr|\$)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b", combined)
    if m:
        num_str = m.group(1).replace(",", "")
        try:
            val = float(num_str)
            if m.group(2):
                val *= 1000
            # Sanity check: reasonable product price > 100
            if val >= 100:
                return val
        except ValueError:
            pass
    return None


def _extract_specs(text: str) -> Dict[str, Any]:
    low = text.lower()
    specs = {}
    m_ram = re.search(r"(\d+)\s?(gb|tb)\s*(ram|memory)?", low)
    if m_ram:
        unit = m_ram.group(2).upper()
        amt = int(m_ram.group(1))
        specs["ram_gb"] = amt * 1024 if unit == "TB" else amt
    return specs


def evaluate_constraints(goal_context: Dict[str, Any], action: Dict[str, Any]) -> Dict[str, Any]:
    """Validates proposed action against goal constraints.

    Returns:
        Dict with:
        - violated: bool
        - severity: 'none' | 'mild' | 'severe'
        - violations: List[Dict[type, expected, actual, detail]]
        - details: List[str] (for backward compatibility)
        - restricted_access: bool
    """
    violations: List[Dict[str, Any]] = []
    details: List[str] = []
    severity = "none"

    # 1. Budget Constraint Check
    budget_limit = goal_context.get("budget_limit")
    action_price = _extract_price(action)

    if budget_limit and action_price is not None:
        if action_price > budget_limit:
            overage = action_price - budget_limit
            pct = (overage / budget_limit) * 100
            is_severe = action_price >= budget_limit * 1.15  # 15%+ over budget is severe

            current_sev = "severe" if is_severe else "mild"
            if severity == "none" or current_sev == "severe":
                severity = current_sev

            msg = f"Price ₹{action_price:,.0f} exceeds budget of ₹{budget_limit:,.0f} by ₹{overage:,.0f} (+{pct:.1f}%)"
            details.append(msg)
            violations.append({
                "type": "BUDGET",
                "expected": f"<= ₹{budget_limit:,.0f}",
                "actual": f"₹{action_price:,.0f}",
                "detail": msg,
                "severity": current_sev
            })

    # 2. Spec Requirements Check (e.g. RAM requirements)
    reqs = goal_context.get("requirements", [])
    combined_action_text = f"{action.get('target', '')} {action.get('reason', '')} " \
                           f"{' '.join(str(v) for v in action.get('parameters', {}).values())}"
    action_specs = _extract_specs(combined_action_text)

    # If goal asks for 16GB RAM and action explicitly specifies a lower amount (e.g. 8GB RAM)
    goal_ram = None
    for r in reqs:
        r_specs = _extract_specs(r)
        if "ram_gb" in r_specs:
            goal_ram = r_specs["ram_gb"]

    if goal_ram and "ram_gb" in action_specs:
        act_ram = action_specs["ram_gb"]
        if act_ram < goal_ram:
            msg = f"RAM specification ({act_ram}GB) does not meet required {goal_ram}GB RAM"
            details.append(msg)
            violations.append({
                "type": "REQUIREMENT_RAM",
                "expected": f">={goal_ram}GB",
                "actual": f"{act_ram}GB",
                "detail": msg,
                "severity": "mild"
            })
            if severity == "none":
                severity = "mild"

    # 3. Restricted Domain Access Check
    target_low = action.get("target", "").lower()
    restricted_domains = goal_context.get("restricted_domains", [
        "purchase_history", "banking", "passwords", "credentials", "unrelated_products"
    ])
    restricted_hit = False
    for rd in restricted_domains:
        if rd in target_low or target_low in rd:
            restricted_hit = True
            msg = f"Accesses restricted domain: '{action.get('target')}'"
            details.append(msg)
            violations.append({
                "type": "RESTRICTED_DOMAIN",
                "expected": "No access to off-limit domains",
                "actual": action.get("target"),
                "detail": msg,
                "severity": "severe"
            })
            severity = "severe"
            break

    violated = len(violations) > 0
    return {
        "constraint_violation": violated,
        "violated": violated,
        "severity": severity,
        "restricted_access": restricted_hit,
        "violations": violations,
        "details": details
    }
