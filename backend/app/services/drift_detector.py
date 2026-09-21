"""Intent drift detection over an action history. TODO(Antigravity): ML/embedding trajectory analysis."""
from typing import Dict, List


def detect_drift(history: List[float], current: float) -> Dict:
    scores = list(history) + [current]
    avg = sum(scores) / len(scores)
    blended = 0.6 * current + 0.4 * avg  # current action weighs more, history smooths noise
    for level, floor in (("STABLE", 85), ("MILD", 70), ("MODERATE", 55), ("HIGH", 35)):
        if blended >= floor:
            break
    else:
        level = "CRITICAL"
    last3 = scores[-3:]
    declining = len(last3) == 3 and last3[0] > last3[1] > last3[2]
    return {
        "current_alignment": round(current, 1),
        "average_alignment": round(avg, 1),
        "drift_level": level,
        "trend": "declining" if declining else "flat/recovering",
        "progression": [round(s) for s in scores],
    }
