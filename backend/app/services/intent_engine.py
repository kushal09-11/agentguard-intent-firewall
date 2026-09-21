"""Goal parsing, intent alignment, constraint + sensitivity checks (rule-based).

TODO(Antigravity): replace parse_goal with LLM extraction and
calculate_intent_alignment with embedding/LLM similarity. Keep the signatures.
"""
import re
from typing import Any, Dict

CATEGORIES = ["laptop", "phone", "headphone", "tablet", "camera", "monitor", "keyboard", "tv", "watch"]
RESTRICTED_DOMAINS = ["purchase_history", "banking", "passwords", "unrelated_products"]
OFF_TOPIC_QUALIFIERS = ["gaming", "luxury"]  # only tolerated if the goal itself mentions them
ACTION_ALIGNMENT = {"search": 95, "filter": 90, "compare": 88, "open": 80, "read": 75}

SENSITIVITY_KEYWORDS = {
    "CRITICAL": ["password", "credential", "bank", "credit card", "debit card", "cvv", "otp", "ssn", "secret", "api key", "token"],
    "HIGH": ["history", "personal", "contact", "email", "address", "payment", "location", "profile"],
    "MEDIUM": ["account", "setting", "cart", "wishlist"],
}


def _n(s: Any) -> str:
    return re.sub(r"[_\-]+", " ", str(s).lower())


def _has(text: str, kw: str) -> bool:
    return re.search(r"\b" + re.escape(kw), text) is not None


def _money(num: str, k: str = "") -> float:
    v = float(num.replace(",", "").rstrip("."))
    return v * 1000 if k else v


def parse_goal(text: str) -> Dict[str, Any]:
    low = _n(text)
    category = next((c for c in CATEGORIES if c in low), "item")
    verb = next((v for v in ("find", "buy", "compare", "search", "book") if low.strip().startswith(v)), "find")
    budget = None
    m = re.search(r"(?:under|below|less than|within|upto|up to|max(?:imum)?|budget(?: of)?)\s*(?:₹|rs\.?|inr|\$)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b", low)
    m = m or re.search(r"(?:₹|rs\.?|inr|\$)\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b", low)
    if m:
        budget = _money(m.group(1).rstrip(","), m.group(2) or "")
    reqs = [f"{n}{u.upper()} {kind.upper()}".strip() for n, u, kind in re.findall(r"(\d+)\s?(gb|tb)\s*(ram|ssd|hdd|storage)?", low)]
    return {
        "objective": f"{verb} {category}",
        "category": category,
        "budget_limit": budget,
        "requirements": reqs,
        "keywords": re.findall(r"[a-z0-9]+", low),
        "restricted_domains": RESTRICTED_DOMAINS,
    }


def classify_sensitivity(action: Dict[str, Any]) -> str:
    text = _n(action["target"]) + " " + " ".join(_n(k) for k in action.get("parameters", {}))
    for level in ("CRITICAL", "HIGH", "MEDIUM"):
        if any(_has(text, kw) for kw in SENSITIVITY_KEYWORDS[level]):
            return level
    return "LOW"


def calculate_intent_alignment(goal: Dict[str, Any], action: Dict[str, Any]) -> int:
    """Return 0-100: how relevant is this action to the user's goal."""
    tgt, act = _n(action["target"]), action["action"]
    if classify_sensitivity(action) in ("HIGH", "CRITICAL"):
        return 5
    if "accessor" in tgt:
        return 50
    if goal["category"] in tgt:
        if any(q in tgt and q not in goal["keywords"] for q in OFF_TOPIC_QUALIFIERS):
            return 30
        return ACTION_ALIGNMENT.get(act, 70)
    return 20


def _price(action: Dict[str, Any]):
    for k in ("price", "max_price", "amount", "budget"):
        v = action.get("parameters", {}).get(k)
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            return float(v)
    m = re.search(r"(?:₹|rs\.?|inr)\s*(\d[\d,]*)\s*(k)?\b", _n(action["target"] + " " + action.get("reason", "")))
    return _money(m.group(1).rstrip(","), m.group(2) or "") if m else None


def check_constraints(goal: Dict[str, Any], action: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic constraint check. severity: none | mild | severe."""
    details, severity = [], "none"
    price, limit = _price(action), goal.get("budget_limit")
    if price is not None and limit and price > limit:
        severity = "severe" if price >= limit * 1.2 else "mild"
        details.append(f"Price ₹{price:,.0f} exceeds budget ₹{limit:,.0f}")
    restricted = classify_sensitivity(action) in ("HIGH", "CRITICAL")
    if restricted:
        severity = "severe"
        details.append(f"Accesses restricted/sensitive data ({action['target']})")
    return {"constraint_violation": bool(details), "severity": severity, "restricted_access": restricted, "details": details}
