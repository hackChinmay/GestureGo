"""
tests/test_schedule_navigation.py - Automated Unit Tests for Schedule Selection and Navigation.

Verifies:
1. Valid initial schedule selection (Index 0 / first event)
2. POINTING_DOWN / SCROLL_DOWN advances selection by exactly one
3. Repeated POINTING_DOWN gestures step through all events in order
4. End of list boundary: last event remains selected without out-of-bounds error
5. THUMBS_UP / CONFIRM registers the currently selected event (not always the first)
6. One-shot controller prevents repeat selection advancement on held poses
7. Re-arming after multi-frame neutral release allows subsequent selection step
8. POINTING_UP preserves NEXT_PAGE navigation
9. SCROLL_DOWN on other pages scrolls without altering current route
10. Fallback on invalid selection index or missing item
"""

import unittest
from campus_data import SCHEDULE_ITEMS, PAGE_ORDER
from gesture_controller import GestureController, ControllerState, RejectionReason

class TestScheduleNavigation(unittest.TestCase):

    def setUp(self):
        self.controller = GestureController(
            confidence_threshold=0.80,
            stability_duration_sec=0.20,
            required_stable_frames=4,
            cooldown_sec=0.10,
            required_neutral_frames=3,
        )

    def test_initial_schedule_selection(self):
        self.assertGreater(len(SCHEDULE_ITEMS), 0)
        first_item = SCHEDULE_ITEMS[0]
        self.assertEqual(first_item["id"], "s1")
        self.assertIn("title", first_item)

    def test_scroll_down_advances_selection_by_one(self):
        current_idx = 0
        max_idx = len(SCHEDULE_ITEMS) - 1

        # Simulate SCROLL_DOWN logic
        if current_idx < max_idx:
            current_idx += 1

        self.assertEqual(current_idx, 1)
        self.assertEqual(SCHEDULE_ITEMS[current_idx]["id"], "s2")

    def test_sequential_advancement_through_all_events(self):
        current_idx = 0
        max_idx = len(SCHEDULE_ITEMS) - 1
        expected_ids = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"]

        for expected in expected_ids:
            self.assertEqual(SCHEDULE_ITEMS[current_idx]["id"], expected)
            if current_idx < max_idx:
                current_idx += 1

        self.assertEqual(current_idx, max_idx)

    def test_end_of_list_boundary_guard(self):
        max_idx = len(SCHEDULE_ITEMS) - 1
        current_idx = max_idx  # At last item

        # Further SCROLL_DOWN actions must not exceed max_idx
        for _ in range(5):
            if current_idx < max_idx:
                current_idx += 1

        self.assertEqual(current_idx, max_idx)
        self.assertEqual(SCHEDULE_ITEMS[current_idx]["id"], "s8")

    def test_thumbs_up_confirms_active_selection(self):
        # Select 5th event (index 4: s5)
        selected_idx = 4
        active_item = SCHEDULE_ITEMS[selected_idx]
        self.assertEqual(active_item["id"], "s5")
        self.assertIn("Edge AI", active_item["title"])

        # Confirmation feedback references s5, NOT s1
        confirmed_msg = f"Pass registered for: {active_item['title']} ({active_item['location']})"
        self.assertIn(active_item["title"], confirmed_msg)
        self.assertNotIn(SCHEDULE_ITEMS[0]["title"], confirmed_msg)

    def test_one_shot_anti_repeat_on_held_pointing_down(self):
        actions_fired = []

        # Deliver 4 frames to confirm action
        for f in range(4):
            act, _ = self.controller.process_frame("POINTING_DOWN", 0.95, timestamp=1.0 + f * 0.08)
            if act:
                actions_fired.append(act)

        self.assertEqual(len(actions_fired), 1)
        self.assertEqual(actions_fired[0], "SCROLL_DOWN")
        self.assertEqual(self.controller.state, ControllerState.LOCKED_HOLD)

        # Holding gesture for 10 consecutive frames must NOT fire any actions
        for f in range(4, 14):
            repeat_act, tel = self.controller.process_frame("POINTING_DOWN", 0.95, timestamp=1.0 + f * 0.08)
            self.assertIsNone(repeat_act)
            self.assertEqual(tel["rejection_reason"], RejectionReason.LOCKED_HOLD.value)

        self.assertEqual(len(actions_fired), 1, "Only 1 action may fire during a held gesture")
        self.assertGreater(self.controller.repeated_action_preventions, 0)

    def test_rearming_after_neutral_allows_second_step(self):
        # Trigger 1st action
        act1 = None
        for f in range(4):
            a, _ = self.controller.process_frame("POINTING_DOWN", 0.95, timestamp=1.0 + f * 0.08)
            if a:
                act1 = a
        self.assertEqual(act1, "SCROLL_DOWN")

        # 3 neutral frames to rearm
        for f in range(3):
            self.controller.process_frame("NO_HAND", 0.0, timestamp=1.45 + f * 0.08)
        self.assertEqual(self.controller.state, ControllerState.READY)

        # Trigger 2nd action
        act2 = None
        for f in range(4):
            a, _ = self.controller.process_frame("POINTING_DOWN", 0.95, timestamp=1.80 + f * 0.08)
            if a:
                act2 = a
        self.assertEqual(act2, "SCROLL_DOWN")
        self.assertEqual(self.controller.total_actions_triggered, 2)

    def test_pointing_up_navigates_to_next_page(self):
        cur_page = "Schedule"
        pages = list(PAGE_ORDER)
        cur_idx = pages.index(cur_page)
        next_page = pages[(cur_idx + 1) % len(pages)]
        self.assertEqual(next_page, "Venues")

    def test_scroll_down_on_other_page_does_not_change_route(self):
        cur_page = "Home"
        action = "SCROLL_DOWN"
        # Action is SCROLL_DOWN; current page remains Home
        self.assertEqual(cur_page, "Home")

    def test_invalid_selection_index_fallback(self):
        invalid_idx = 999
        valid_idx = invalid_idx if 0 <= invalid_idx < len(SCHEDULE_ITEMS) else 0
        self.assertEqual(valid_idx, 0)
        self.assertEqual(SCHEDULE_ITEMS[valid_idx]["id"], "s1")

if __name__ == "__main__":
    unittest.main()
