"""Progressive Intent Drift Detection Engine for AgentGuard.
Analyzes the entire sequential trajectory of an agent's actions over time.
Detects gradual divergence, sudden alignment drops, cumulative drift,
consecutive off-goal behavior, and assigns trajectory severity.
"""
from typing import Any, Dict, List


def detect_drift(history: List[float], current: float) -> Dict[str, Any]:
    """Evaluates progressive intent drift given previous alignments and the current score.

    Args:
        history: List of float alignment scores (0-100) from earlier actions in this session.
        current: Float alignment score (0-100) of the proposed action.

    Returns:
        Structured drift report including delta, moving average, trend,
        consecutive off-goal actions, cumulative drift score, and severity.
    """
    scores = [float(s) for s in history] + [float(current)]
    n = len(scores)

    # Previous alignment and instantaneous drop (delta)
    prev = float(history[-1]) if history else float(current)
    delta = round(current - prev, 1)

    # Moving average (last up to 5 actions)
    recent_window = scores[-5:]
    moving_avg = sum(recent_window) / len(recent_window)

    # Cumulative session average
    cumulative_avg = sum(scores) / n

    # Consecutive off-goal count (alignment < 65)
    consecutive_off_goal = 0
    for s in reversed(scores):
        if s < 65:
            consecutive_off_goal += 1
        else:
            break

    # Trend direction based on recent slope
    if len(scores) >= 2:
        if delta <= -8:
            trend = "DOWNWARD"
        elif delta >= 8:
            trend = "UPWARD"
        else:
            # Check last 3 actions for gradual direction
            if len(scores) >= 3 and scores[-1] < scores[-2] < scores[-3]:
                trend = "DOWNWARD"
            elif len(scores) >= 3 and scores[-1] > scores[-2] > scores[-3]:
                trend = "UPWARD"
            else:
                trend = "STABLE"
    else:
        trend = "STABLE"

    # Cumulative drift calculation:
    # 1. Base drift from current action (100 - current)
    base_current_drift = max(0.0, 100.0 - current)

    # 2. Historical drift from moving average
    base_history_drift = max(0.0, 100.0 - moving_avg)

    # 3. Penalty for sudden drop (e.g. dropping 30+ points suddenly)
    drop_penalty = 0.0
    if delta < -20:
        drop_penalty = min(25.0, abs(delta) * 0.6)

    # 4. Penalty for persistent off-goal streak
    streak_penalty = min(30.0, consecutive_off_goal * 10.0)

    # Weighted composite drift score (0 to 100)
    raw_drift_score = (
        0.45 * base_current_drift +
        0.30 * base_history_drift +
        drop_penalty +
        streak_penalty
    )
    drift_score = round(max(0.0, min(100.0, raw_drift_score)), 1)

    # Assign severity classification:
    # STABLE, MILD, MODERATE, HIGH, CRITICAL
    if current <= 15 or consecutive_off_goal >= 3 or drift_score >= 75:
        severity = "CRITICAL"
    elif current <= 40 or consecutive_off_goal >= 2 or drift_score >= 55:
        severity = "HIGH"
    elif current <= 60 or consecutive_off_goal >= 1 or drift_score >= 35 or delta <= -25:
        severity = "MODERATE"
    elif drift_score >= 20 or current <= 75:
        severity = "MILD"
    else:
        severity = "STABLE"

    # Backward compatibility with existing policy checks:
    # Map to drift_level
    drift_level = severity

    return {
        "current_alignment": round(current, 1),
        "previous_alignment": round(prev, 1),
        "delta": delta,
        "moving_average": round(moving_avg, 1),
        "average_alignment": round(cumulative_avg, 1),
        "trend": trend,
        "consecutive_off_goal_actions": consecutive_off_goal,
        "drift_score": drift_score,
        "severity": severity,
        "drift_level": drift_level,
        "progression": [round(s) for s in scores],
    }
