"""Goal parsing, intent alignment, constraint and sensitivity checks.
Serves as the high-level façade delegating to specialized engines:
- semantic_engine (semantic ontology & vector similarity)
- constraint_engine (budget, specifications, domain bounds)
- sensitivity_engine (resource classification)
Maintains backward compatibility with all legacy signatures.
"""
import re
from typing import Any, Dict, List

from app.services.constraint_engine import evaluate_constraints
from app.services.semantic_engine import calculate_semantic_alignment
from app.services.sensitivity_engine import classify_resource_sensitivity

CATEGORIES = ["laptop", "phone", "headphone", "tablet", "camera", "monitor", "keyboard", "tv", "watch"]
RESTRICTED_DOMAINS = ["purchase_history", "banking", "passwords", "unrelated_products", "credentials"]


def _n(s: Any) -> str:
    return re.sub(r"[_\-]+", " ", str(s).lower())


def _money(num: str, k: str = "") -> float:
    v = float(num.replace(",", "").rstrip("."))
    return v * 1000 if k else v


def parse_goal(text: str) -> Dict[str, Any]:
    """Parses natural language goal into structured intent representation."""
    low = _n(text)
    category = next((c for c in CATEGORIES if c in low), "item")
    verb = next((v for v in ("find", "buy", "compare", "search", "book", "recommend", "select") if low.strip().startswith(v)), "find")

    # Extract budget
    budget = None
    m = re.search(
        r"(?:under|below|less than|within|upto|up to|max(?:imum)?|budget(?: of)?)\s*(?:₹|rs\.?|inr|\$)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b",
        low,
    )
    m = m or re.search(r"(?:₹|rs\.?|inr|\$)\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b", low)
    if m:
        budget = _money(m.group(1).rstrip(","), m.group(2) or "")

    # Extract RAM / Storage / Specs
    reqs = [
        f"{n}{u.upper()} {kind.upper()}".strip()
        for n, u, kind in re.findall(r"(\d+)\s?(gb|tb)\s*(ram|ssd|hdd|storage)?", low)
    ]
    if "programming" in low or "coding" in low or "developer" in low:
        reqs.append("programming suitability")

    return {
        "objective": f"{verb} {category}",
        "category": category,
        "budget_limit": budget,
        "requirements": reqs,
        "keywords": re.findall(r"[a-z0-9]+", low),
        "restricted_domains": RESTRICTED_DOMAINS,
    }


def classify_sensitivity(action: Dict[str, Any]) -> str:
    """Classifies resource sensitivity into CRITICAL, HIGH, MEDIUM, or LOW."""
    result = classify_resource_sensitivity(action)
    return result["level"]


def calculate_intent_alignment(goal: Dict[str, Any], action: Dict[str, Any]) -> int:
    """Calculates 0-100 semantic intent alignment score."""
    res = calculate_semantic_alignment(goal, action)
    return int(res["alignment_score"])


def check_constraints(goal: Dict[str, Any], action: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluates explicit constraints against the goal."""
    return evaluate_constraints(goal, action)
