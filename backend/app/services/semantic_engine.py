"""Modular Semantic Intent Layer for AgentGuard.
Extracts concepts from goals and actions, resolves semantic domain synonyms,
computes vector cosine & concept alignment, and produces explainable matching.
Runs 100% locally and offline with zero external API dependencies.
"""
import math
import re
from collections import Counter
from typing import Any, Dict, List, Set, Tuple

# Domain ontology mapping synonyms and related terminology to canonical concepts
CONCEPT_SYNONYMS: Dict[str, Set[str]] = {
    "laptop": {"laptop", "notebook", "ultrabook", "netbook", "macbook", "thinkpad", "computer", "pc"},
    "programming": {
        "programming", "developer", "coding", "software", "coder", "dev",
        "engineering", "scripting", "python", "javascript", "code"
    },
    "flight": {
        "flight", "flights", "airline", "airfare", "plane", "ticket", "tickets",
        "indigo", "airindia", "vistara", "spicejet", "akasa", "airport",
        "hyd", "delhi", "mumbai", "blr", "departure", "arrival", "nonstop", "layover", "passenger"
    },
    "travel": {
        "travel", "trip", "tour", "tourism", "vacation", "destination",
        "hotel", "resort", "booking", "boarding"
    },
    "cpu": {"cpu", "processor", "chipset", "chip", "core", "intel", "amd", "ryzen", "silicon"},
    "ram": {"ram", "memory", "ddr", "ddr4", "ddr5", "16gb", "32gb", "8gb"},
    "storage": {"storage", "ssd", "nvme", "hdd", "drive", "disk"},
    "search": {"search", "find", "lookup", "explore", "query", "browse", "discover", "seek"},
    "filter": {"filter", "refine", "narrow", "constrain", "screen", "limit", "budget"},
    "compare": {"compare", "comparison", "benchmark", "contrast", "evaluate", "vs", "versus"},
    "inspect": {"open", "inspect", "view", "examine", "read", "details"},
    "accessories": {"accessory", "accessories", "bag", "sleeve", "mouse", "keyboard", "stand", "hub", "charger", "luggage", "lounge"},
    "gaming": {"gaming", "gamer", "rtx", "geforce", "gpu", "overclocked"},
    "luxury": {"luxury", "vip", "suite", "first_class", "business_class"},
    "sensitive_data": {
        "purchase_history", "history", "purchases", "order_history",
        "banking", "bank", "financial", "credit_card", "account_balance",
        "password", "passwords", "credential", "credentials", "api_key", "secret", "passport"
    }
}

# Reverse lookup for fast token-to-concept mapping
TOKEN_TO_CONCEPT: Dict[str, str] = {}
for concept, tokens in CONCEPT_SYNONYMS.items():
    for token in tokens:
        TOKEN_TO_CONCEPT[token] = concept


def _normalize(text: Any) -> str:
    if text is None:
        return ""
    text_str = str(text).lower()
    return re.sub(r"[_\-/\\]+", " ", text_str)


def _tokenize(text: str) -> List[str]:
    return [w for w in re.findall(r"[a-z0-9]+", _normalize(text)) if len(w) > 1]


def extract_concepts(text: str) -> Set[str]:
    tokens = _tokenize(text)
    concepts = set()
    for token in tokens:
        if token in TOKEN_TO_CONCEPT:
            concepts.add(TOKEN_TO_CONCEPT[token])
    # Also check multi-word or compound concepts
    lowered = _normalize(text)
    if "purchase history" in lowered or "purchase_history" in lowered:
        concepts.add("sensitive_data")
    if "developer notebook" in lowered or "coding laptop" in lowered:
        concepts.add("programming")
        concepts.add("laptop")
    if "processor and memory" in lowered:
        concepts.add("cpu")
        concepts.add("ram")
    if "air india" in lowered or "business class" in lowered:
        concepts.add("flight")
    if "lounge pass" in lowered or "travel luggage" in lowered:
        concepts.add("accessories")
    return concepts


def _cosine_similarity(vec1: Counter, vec2: Counter) -> float:
    intersection = set(vec1.keys()) & set(vec2.keys())
    numerator = sum(vec1[x] * vec2[x] for x in intersection)
    sum1 = sum(vec1[x] ** 2 for x in vec1.keys())
    sum2 = sum(vec2[x] ** 2 for x in vec2.keys())
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    if not denominator:
        return 0.0
    return float(numerator) / denominator


def calculate_semantic_alignment(goal_context: Dict[str, Any], action: Dict[str, Any]) -> Dict[str, Any]:
    """Calculates semantic alignment score (0-100), matched concepts, unmatched concepts, and explanation.

    Args:
        goal_context: parsed goal dict with objective, category, requirements, keywords.
        action: proposed action dict with action, target, parameters, reason.
    """
    action_type = action.get("action", "").lower().strip()
    target = action.get("target", "").lower().strip()
    reason = action.get("reason", "").lower().strip()
    params = action.get("parameters", {})
    param_str = " ".join(f"{k} {v}" for k, v in params.items())

    action_full_text = f"{action_type} {target} {reason} {param_str}"
    goal_full_text = f"{goal_context.get('objective', '')} {goal_context.get('category', '')} " \
                     f"{' '.join(goal_context.get('requirements', []))} {' '.join(goal_context.get('keywords', []))}"

    goal_concepts = extract_concepts(goal_full_text)
    action_concepts = extract_concepts(action_full_text)

    # Concept overlap
    matched = sorted(list(goal_concepts & action_concepts))
    unmatched_action = sorted(list(action_concepts - goal_concepts))

    # Vector token similarity
    goal_tokens = Counter(_tokenize(goal_full_text))
    action_tokens = Counter(_tokenize(action_full_text))
    token_sim = _cosine_similarity(goal_tokens, action_tokens)

    category = goal_context.get("category", "item")
    target_norm = _normalize(target)
    keywords = set(goal_context.get("keywords", []))

    # Base heuristic starting score
    # 1. Check for direct restricted/sensitive concepts first
    if "sensitive_data" in action_concepts or any(r in target_norm for r in ["banking", "purchase", "password", "credential", "passport"]):
        score = 5
        reason_text = f"Action targets restricted/sensitive domain '{target}' which has no alignment with user objective."
        return {
            "alignment_score": score,
            "matched_concepts": matched,
            "unmatched_concepts": unmatched_action or [target],
            "reason": reason_text,
            "semantic_similarity": round(token_sim, 2)
        }

    # 2. Accessories & tangential add-ons check (drift from main goal)
    if "accessories" in action_concepts or any(k in target_norm for k in ["accessor", "lounge", "luggage"]):
        score = 50
        reason_text = f"Action searches for accessories or add-ons, which are tangentially related but diverge from the primary {category} selection goal."
        return {
            "alignment_score": score,
            "matched_concepts": [c for c in matched if c != "accessories"],
            "unmatched_concepts": ["accessories"],
            "reason": reason_text,
            "semantic_similarity": round(token_sim, 2)
        }

    # 3. Gaming or off-topic qualifiers check
    if ("gaming" in action_concepts and "gaming" not in goal_concepts) or \
       ("luxury" in action_concepts and "luxury" not in goal_concepts):
        score = 30
        reason_text = f"Action explores off-topic target ('{target}') which represents an unauthorized drift from the user's objective."
        return {
            "alignment_score": score,
            "matched_concepts": matched,
            "unmatched_concepts": [c for c in action_concepts if c not in goal_concepts] or [target],
            "reason": reason_text,
            "semantic_similarity": round(token_sim, 2)
        }

    # 4. Check category / domain alignment with user's actual goal
    cat_match = False
    if category in ("laptop", "computer", "pc"):
        cat_match = any(k in target_norm for k in ["laptop", "notebook", "thinkpad", "macbook", "pc", "computer"]) or "laptop" in action_concepts
    elif category in ("flight", "airline", "travel"):
        cat_match = any(k in target_norm for k in ["flight", "airline", "hyd", "delhi", "ticket", "indigo", "vistara", "air india", "plane"]) or "flight" in action_concepts
    elif category != "item":
        cat_match = category in target_norm or category in action_concepts

    domain_overlap = bool((goal_concepts - {"search", "filter", "compare", "inspect"}) & action_concepts)
    kw_overlap = bool(set(_tokenize(action_full_text)) & (keywords - {"under", "with", "find", "and", "the", "for", "from", "to", "rupees", "rs"}))

    is_aligned = cat_match or domain_overlap or (category == "item" and kw_overlap)

    if is_aligned:
        if action_type in ("search", "find"):
            score = 95
            reason_text = f"High alignment: Directly searches for candidate {category}s matching user intent."
        elif action_type in ("filter", "refine"):
            score = 90
            reason_text = f"High alignment: Filters {category} candidates according to user requirements."
        elif action_type in ("compare", "evaluate"):
            if "cpu" in action_concepts or "ram" in action_concepts:
                score = 88
                reason_text = "High alignment: Compares hardware specifications (CPU/RAM) relevant to programming suitability."
            elif any(k in target_norm for k in ["timing", "airline", "duration", "rating"]):
                score = 88
                reason_text = "High alignment: Compares flight timings, airlines, and duration matching travel requirements."
            else:
                score = 85
                reason_text = f"High alignment: Compares candidate {category} specifications."
        elif action_type in ("open", "view"):
            score = 80
            reason_text = f"Good alignment: Opens detailed specifications of relevant {category}."
        elif action_type in ("read", "inspect"):
            score = 75
            reason_text = "Moderate alignment: Inspects relevant technical documentation or product reviews."
        else:
            score = 70
            reason_text = f"Moderate alignment: Action on target {target} within goal category."
    else:
        # Action does not match user's actual goal category
        score = max(15, min(35, int(token_sim * 100)))
        reason_text = f"Low alignment: Target '{target}' does not match user's goal category '{category}'."

    return {
        "alignment_score": score,
        "matched_concepts": matched,
        "unmatched_concepts": unmatched_action,
        "reason": reason_text,
        "semantic_similarity": round(token_sim, 2)
    }
