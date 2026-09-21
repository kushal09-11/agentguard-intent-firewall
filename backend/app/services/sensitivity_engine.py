"""Context-Aware Sensitivity Engine for AgentGuard.
Classifies resources, targets, parameters, and payloads into LOW, MEDIUM, HIGH, and CRITICAL tiers.
Identifies sensitive data exposure risks before execution.
"""
import re
from typing import Any, Dict, List, Set, Tuple

SENSITIVITY_LEVELS = {
    "CRITICAL": {
        "score": 100,
        "keywords": [
            "password", "passwords", "credential", "credentials", "bank", "banking",
            "credit card", "debit card", "cvv", "otp", "ssn", "secret", "secrets",
            "api key", "api_key", "token", "auth_token", "private_key", "wire_transfer"
        ],
        "description": "Critical security or financial assets (banking, passwords, API tokens)."
    },
    "HIGH": {
        "score": 80,
        "keywords": [
            "purchase_history", "purchase history", "order_history", "orders",
            "financial_history", "personal", "contact", "email", "address",
            "payment", "location", "profile", "private_doc", "tax_record", "id_proof"
        ],
        "description": "High-risk personal records or confidential purchase history."
    },
    "MEDIUM": {
        "score": 50,
        "keywords": [
            "account", "setting", "settings", "cart", "wishlist", "preferences", "saved_items"
        ],
        "description": "User account configurations, preferences, or shopping cart state."
    },
    "LOW": {
        "score": 10,
        "keywords": [
            "search", "product", "laptop", "spec", "specs", "review", "reviews",
            "public", "catalog", "browse", "compare", "filter", "hardware", "accessory"
        ],
        "description": "Public domain information and product catalogs."
    }
}


def _normalize(text: Any) -> str:
    if text is None:
        return ""
    return re.sub(r"[_\-/\\]+", " ", str(text).lower())


def _has_keyword(text: str, kw: str) -> bool:
    kw_norm = _normalize(kw)
    pattern = r"\b" + re.escape(kw_norm) + r"\b"
    return re.search(pattern, text) is not None or kw_norm in text


def classify_resource_sensitivity(action: Dict[str, Any]) -> Dict[str, Any]:
    """Inspects action target, parameters, and metadata to determine sensitivity level.

    Returns:
        Dict with level, score, matched_keywords, is_sensitive, explanation.
    """
    target = _normalize(action.get("target", ""))
    reason = _normalize(action.get("reason", ""))
    params = " ".join(_normalize(f"{k} {v}") for k, v in action.get("parameters", {}).items())
    combined = f"{target} {params} {reason}"

    matched_keywords: List[str] = []

    for level in ("CRITICAL", "HIGH", "MEDIUM"):
        config = SENSITIVITY_LEVELS[level]
        for kw in config["keywords"]:
            if _has_keyword(combined, kw):
                matched_keywords.append(kw)

        if matched_keywords:
            return {
                "level": level,
                "score": config["score"],
                "matched_keywords": sorted(list(set(matched_keywords))),
                "is_sensitive": True,
                "explanation": config["description"]
            }

    return {
        "level": "LOW",
        "score": SENSITIVITY_LEVELS["LOW"]["score"],
        "matched_keywords": [],
        "is_sensitive": False,
        "explanation": SENSITIVITY_LEVELS["LOW"]["description"]
    }
