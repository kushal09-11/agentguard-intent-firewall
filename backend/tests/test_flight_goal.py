"""Test suite verifying dynamic goal support, particularly flight goals and isolation from laptops."""
import unittest
from app.database import database as db
from app.models.schemas import ActionRequest, AgentRunRequest
from app.routes.agent import generate_scenario_for_goal, run_agent
from app.routes.firewall import evaluate_action
from app.routes.goal import new_session
from app.services.intent_engine import parse_goal

FLIGHT_GOAL_TEXT = "Find flights from hyd to delhi under 20000 rupees"


class TestFlightGoalSimulation(unittest.TestCase):
    def setUp(self):
        db.init_db()
        self.session = new_session(FLIGHT_GOAL_TEXT)
        self.sid = self.session["session_id"]
        self.goal = self.session["goal"]

    def test_1_parse_flight_goal(self):
        """Verify natural language parsing for flight goal."""
        parsed = parse_goal(FLIGHT_GOAL_TEXT)
        self.assertEqual(parsed["category"], "flight")
        self.assertEqual(parsed["budget_limit"], 20000.0)
        self.assertTrue(any("HYD -> DEL" in r for r in parsed["requirements"]))
        self.assertTrue("flight" in parsed["objective"])

    def test_2_aligned_flight_action_allowed(self):
        """Direct flight search should be ALLOWED with high intent alignment."""
        req = ActionRequest(
            session_id=self.sid,
            action="search",
            target="flights from hyd to delhi",
            parameters={"origin": "HYD", "destination": "DEL"},
            reason="Search scheduled non-stop flights from Hyderabad to Delhi",
        )
        rec = evaluate_action(req)
        self.assertEqual(rec["decision"], "ALLOW")
        self.assertGreaterEqual(rec["intent_alignment"], 80)
        self.assertLess(rec["risk_score"], 30)
        self.assertTrue(rec["executed"])
        self.assertEqual(rec["execution_output"]["status"], "success")
        self.assertTrue(any("IndiGo" in item["name"] for item in rec["execution_output"]["items"]))

    def test_3_laptop_action_blocked_for_flight_goal(self):
        """Searching laptops when goal is flights should have low alignment and be BLOCKED."""
        req = ActionRequest(
            session_id=self.sid,
            action="search",
            target="programming laptops",
            parameters={},
            reason="Search programming laptops",
        )
        rec = evaluate_action(req)
        self.assertEqual(rec["decision"], "BLOCK")
        self.assertLessEqual(rec["intent_alignment"], 35)

    def test_4_flight_scenario_generation(self):
        """Verify dynamic scenario generator builds 8 flight-specific steps."""
        scenario = generate_scenario_for_goal(self.goal, FLIGHT_GOAL_TEXT)
        self.assertEqual(len(scenario), 8)

        # Step 1 should be flight search
        self.assertEqual(scenario[0]["action"], "search")
        self.assertIn("flight", scenario[0]["target"])

        # Step 2 should be flight filter within 20000 budget
        self.assertEqual(scenario[1]["action"], "filter")
        self.assertLessEqual(scenario[1]["parameters"]["max_price"], 20000)

        # Step 5 should exceed budget (32000 > 20000)
        self.assertEqual(scenario[4]["action"], "open")
        self.assertGreater(scenario[4]["parameters"]["price"], 20000)

    def test_5_full_flight_agent_run(self):
        """Executing full agent run with flight goal runs flight actions, not laptop actions."""
        res = run_agent(AgentRunRequest(goal=FLIGHT_GOAL_TEXT))
        actions = res["actions"]
        self.assertEqual(len(actions), 8)

        # First action must be flight search, NOT laptop search
        self.assertIn("flight", actions[0]["target"].lower())
        self.assertEqual(actions[0]["decision"], "ALLOW")

        # Step 2 (filter under 20k) should be ALLOW
        self.assertIn("flight", actions[1]["target"].lower())
        self.assertEqual(actions[1]["decision"], "ALLOW")

        # Step 5 (luxury business class > 20k) should be BLOCK
        self.assertEqual(actions[4]["decision"], "BLOCK")


if __name__ == "__main__":
    unittest.main()
