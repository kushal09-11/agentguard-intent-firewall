"""Prompt Injection Signal Detector for AgentGuard.
Detects indirect and direct prompt injection patterns in tool parameters,
external webpage payloads, and agent instruction contexts.
"""
import re
from typing import Any, Dict, List, Tuple

INJECTION_PATTERNS = [
    (
        "instruction_override",
        r"(?:ignore|disregard|forget|bypass|override)\s+(?:all\s+)?(?:previous|prior|system|user|above)?\s*(?:instructions|prompts|commands|rules|directives)",
        0.95
    ),
    (
        "system_instruction_spoofing",
        r"(?:\[\s*system\s*\]|<\s*system\s*>|<\s*instruction\s*>|system\s*:\s*|new\s+system\s+directive)",
        0.90
    ),
    (
        "user_intent_replacement",
        r"(?:do\s+not\s+follow|stop\s+doing|instead\s+of|switch\s+task\s+to|new\s+goal\s+is|forget\s+the\s+user|ignore\s+the\s+user)",
        0.88
    ),
    (
        "sensitive_data_exfiltration",
        r"(?:reveal|exfiltrate|send|read|access|dump|show|output)\s+(?:all\s+)?(?:secrets|credentials|passwords|banking|api\s*keys|private\s*files|tokens)",
        0.92
    ),
    (
        "jailbreak_delimiter_attack",
        r"(?:===\s*END\s*===|---\s*NEW\s+SESSION\s*---|###\s*SYSTEM\s*UPDATE)",
        0.85
    ),
]


def detect_prompt_injection(content: Any) -> Dict[str, Any]:
    """Analyzes text/data for prompt injection patterns.

    Args:
        content: string, dict, or list of parameters/text.

    Returns:
        Dict with:
        - detected: bool
        - confidence: float (0.0 to 1.0)
        - signals: List[str]
        - matched_patterns: List[str]
        - explanation: str
    """
    if not content:
        return {
            "detected": False,
            "confidence": 0.0,
            "signals": [],
            "matched_patterns": [],
            "explanation": "No injection patterns detected."
        }

    # Convert complex payloads to string
    if isinstance(content, (dict, list)):
        text = str(content)
    else:
        text = str(content)

    text_lower = text.lower()
    signals: List[str] = []
    matched_patterns: List[str] = []
    max_confidence = 0.0

    for signal_name, pattern, weight in INJECTION_PATTERNS:
        matches = re.findall(pattern, text_lower)
        if matches:
            signals.append(signal_name)
            matched_patterns.extend(matches if isinstance(matches[0], str) else [m[0] for m in matches])
            if weight > max_confidence:
                max_confidence = weight

    detected = len(signals) > 0
    if detected:
        explanation = (
            f"Adversarial prompt injection signal detected ({', '.join(signals)}). "
            f"Pattern attempts to override system instructions or hijack agent execution."
        )
    else:
        explanation = "Input verified: No instruction overrides or injection signatures found."

    return {
        "detected": detected,
        "confidence": round(max_confidence, 2) if detected else 0.0,
        "signals": signals,
        "matched_patterns": matched_patterns,
        "explanation": explanation
    }
