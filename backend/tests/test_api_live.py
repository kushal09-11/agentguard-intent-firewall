"""Live API integration test script using standard library urllib."""
import json
import unittest
import urllib.error
import urllib.request

BASE_URL = "http://127.0.0.1:8000/api"


def request(method, path, body=None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"} if body is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            return status, json.loads(content) if content else None
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        e.close()
        return e.code, json.loads(content) if content else None


class TestLiveEndpoints(unittest.TestCase):
    def test_health(self):
        status, data = request("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(data.get("status"), "ok")

    def test_goal_creation_and_session(self):
        status, data = request("POST", "/goal", {"goal": "Find flights from hyd to delhi under 20000 rupees"})
        self.assertEqual(status, 200)
        sid = data["session_id"]
        self.assertTrue(sid)

        # Get session
        status, sdata = request("GET", f"/session/{sid}")
        self.assertEqual(status, 200)
        self.assertEqual(sdata["session_id"], sid)
        self.assertEqual(sdata["goal"]["category"], "flight")

    def test_empty_goal_400(self):
        status, data = request("POST", "/goal", {"goal": "   "})
        self.assertEqual(status, 400)

    def test_agent_run_flight_goal(self):
        status, data = request("POST", "/agent/run", {"goal": "Find flights from hyd to delhi under 20000 rupees"})
        self.assertEqual(status, 200)
        actions = data["actions"]
        self.assertEqual(len(actions), 8)
        self.assertIn("flight", actions[0]["target"].lower())
        self.assertEqual(actions[0]["decision"], "ALLOW")

    def test_agent_scenario_query(self):
        status, data = request("GET", "/agent/scenario?goal=Find+flights+under+15000")
        self.assertEqual(status, 200)
        self.assertIn("flight", data["steps"][0]["target"].lower())

    def test_policy_get_and_put(self):
        status, policy = request("GET", "/policy")
        self.assertEqual(status, 200)
        self.assertIn("allow_threshold", policy)

        # Update policy
        status, updated = request("PUT", "/policy", {
            "allow_threshold": 32.0,
            "review_threshold": 68.0,
            "hard_rules": {"block_critical_sensitivity": True}
        })
        self.assertEqual(status, 200)
        self.assertEqual(updated["allow_threshold"], 32.0)

        # Restore default
        request("PUT", "/policy", {
            "allow_threshold": 30.0,
            "review_threshold": 65.0,
            "hard_rules": {"block_critical_sensitivity": True}
        })

    def test_evaluate_and_review_workflow(self):
        # Create session
        status, sdata = request("POST", "/goal", {"goal": "Find a programming laptop under 60000"})
        sid = sdata["session_id"]

        # Evaluate review action
        status, act = request("POST", "/firewall/evaluate", {
            "session_id": sid,
            "action": "search",
            "target": "laptop accessories",
            "parameters": {"type": "stand"},
            "reason": "Search stand"
        })
        self.assertEqual(status, 200)
        self.assertEqual(act["decision"], "REVIEW")
        aid = act["id"]

        # Review approve
        status, reviewed = request("POST", f"/review/{aid}", {
            "decision": "APPROVED",
            "notes": "Approved for testing"
        })
        self.assertEqual(status, 200)
        self.assertEqual(reviewed["decision"], "ALLOW")
        self.assertTrue(reviewed["executed"])

        # Check analytics
        status, analytics = request("GET", f"/analytics/{sid}")
        self.assertEqual(status, 200)
        self.assertEqual(analytics["analytics"]["approved"], 1)

        # Check audit trail
        status, audit = request("GET", f"/audit/{sid}")
        self.assertEqual(status, 200)
        self.assertEqual(len(audit), 1)


if __name__ == "__main__":
    unittest.main()
