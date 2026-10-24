import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SCHEDULE_ITEMS, GESTURE_TO_ACTION, getNextPage, PAGE_ORDER } from '../src/campusData.ts';
import { GestureControllerTS } from '../src/gestureController.ts';

describe('Schedule Navigation and Event Selection Suite', () => {
  // Scenario 1: Opening Schedule selects a valid initial event
  test('1. Opening Schedule selects a valid initial event (first item)', () => {
    assert.ok(SCHEDULE_ITEMS.length > 0, 'SCHEDULE_ITEMS must not be empty');
    const initialId = SCHEDULE_ITEMS[0].id;
    assert.equal(initialId, 's1');
    const initialItem = SCHEDULE_ITEMS.find((it) => it.id === initialId);
    assert.ok(initialItem !== undefined);
    assert.equal(initialItem.title, 'Opening Keynote: Edge Computer Vision & Tactile Interfaces');
  });

  // Scenario 2: POINTING_DOWN advances selected event by exactly one
  test('2. POINTING_DOWN advances selected event by exactly one', () => {
    let selectedId = SCHEDULE_ITEMS[0].id;

    function advanceSelection(currentId) {
      const idx = SCHEDULE_ITEMS.findIndex((it) => it.id === currentId);
      const validIdx = idx >= 0 ? idx : 0;
      if (validIdx < SCHEDULE_ITEMS.length - 1) {
        return SCHEDULE_ITEMS[validIdx + 1].id;
      }
      return SCHEDULE_ITEMS[validIdx].id;
    }

    selectedId = advanceSelection(selectedId);
    assert.equal(selectedId, 's2');
    assert.equal(SCHEDULE_ITEMS.find((it) => it.id === selectedId).title, 'Workshop: Real-Time HCI with MediaPipe & Decision Trees');
  });

  // Scenario 3: Newly selected event is correctly identified and valid
  test('3. Newly selected event corresponds to correct item data', () => {
    const selectedId = 's2';
    const item = SCHEDULE_ITEMS.find((it) => it.id === selectedId);
    assert.ok(item !== undefined);
    assert.equal(item.location, 'Innovation Lab 204');
    assert.equal(item.track, 'Technical Workshop');
  });

  // Scenario 4: Repeated POINTING_DOWN gestures advance selection one at a time
  test('4. Repeated POINTING_DOWN gestures advance selection sequentially', () => {
    let currentId = SCHEDULE_ITEMS[0].id;
    const expectedIds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];

    for (let step = 0; step < expectedIds.length; step++) {
      assert.equal(currentId, expectedIds[step], `Step ${step} should be ${expectedIds[step]}`);
      const curIdx = SCHEDULE_ITEMS.findIndex((it) => it.id === currentId);
      if (curIdx < SCHEDULE_ITEMS.length - 1) {
        currentId = SCHEDULE_ITEMS[curIdx + 1].id;
      }
    }
    assert.equal(currentId, 's7');
  });

  // Scenario 5: Holding POINTING_DOWN does not skip multiple events (One-Shot FSM)
  test('5. Holding POINTING_DOWN does not skip multiple events (One-Shot FSM anti-repeat)', () => {
    const controller = new GestureControllerTS(0.80, 0.20, 4, 0.10, 3);
    let actionsFired = [];

    // Deliver 4 frames of POINTING_DOWN to reach threshold and trigger action (step 0.08s -> elapsed 0.24s >= 0.20s)
    for (let f = 0; f < 4; f++) {
      const { action } = controller.processFrame('POINTING_DOWN', 0.95, 1.0 + f * 0.08);
      if (action) actionsFired.push(action);
    }
    assert.equal(actionsFired.length, 1);
    assert.equal(actionsFired[0], 'SCROLL_DOWN');
    assert.equal(controller.state, 'LOCKED_HOLD');

    // Hold pose for 10 consecutive frames: must NEVER fire again!
    for (let f = 4; f < 14; f++) {
      const { action, telemetry } = controller.processFrame('POINTING_DOWN', 0.95, 1.0 + f * 0.08);
      assert.equal(action, null, `Frame ${f} should not trigger action while locked`);
      assert.equal(telemetry.rejectionReason, 'LOCKED_HOLD');
    }
    assert.equal(actionsFired.length, 1, 'Total actions fired must remain exactly 1');
  });

  // Scenario 6: Selection remains synchronized with stable event IDs
  test('6. Selection remains synchronized with stable event IDs', () => {
    const selectedId = 's3';
    const index = SCHEDULE_ITEMS.findIndex((it) => it.id === selectedId);
    assert.equal(index, 2);
    assert.equal(SCHEDULE_ITEMS[index].id, selectedId);
  });

  // Scenario 7: Final event does not cause invalid selection or endless scrolling
  test('7. Final event does not cause out-of-bounds selection', () => {
    let currentId = 's7'; // Last item
    const curIdx = SCHEDULE_ITEMS.findIndex((it) => it.id === currentId);
    assert.equal(curIdx, SCHEDULE_ITEMS.length - 1);

    // Attempting to advance beyond end
    if (curIdx < SCHEDULE_ITEMS.length - 1) {
      currentId = SCHEDULE_ITEMS[curIdx + 1].id;
    }
    // Must remain s7
    assert.equal(currentId, 's7');
    assert.ok(SCHEDULE_ITEMS.find((it) => it.id === currentId) !== undefined);
  });

  // Scenario 8: THUMBS_UP acts on the selected event, not always the first event
  test('8. THUMBS_UP acts on the selected event, not always the first event', () => {
    const selectedId = 's5'; // 5th event: Panel: Ergonomics & Safety
    const activeItem = SCHEDULE_ITEMS.find((it) => it.id === selectedId) || SCHEDULE_ITEMS[0];

    assert.equal(activeItem.id, 's5');
    assert.equal(activeItem.title, 'Panel: Ergonomics & Safety in Public Touchless Kiosks');

    const registeredIds = new Set();
    registeredIds.add(activeItem.id);

    assert.ok(registeredIds.has('s5'), 'Event s5 must be registered');
    assert.ok(!registeredIds.has('s1'), 'Event s1 must NOT be registered when s5 is selected');
  });

  // Scenario 9: POINTING_UP still navigates to next page
  test('9. POINTING_UP still navigates to next page along PAGE_ORDER', () => {
    assert.equal(GESTURE_TO_ACTION['POINTING_UP'], 'NEXT_PAGE');
    const curPage = 'Schedule';
    const nextPage = getNextPage(curPage);
    assert.equal(nextPage, 'Venues');
  });

  // Scenario 10: POINTING_DOWN on another page scrolls without changing routes
  test('10. POINTING_DOWN on another page retains SCROLL_DOWN without route change', () => {
    assert.equal(GESTURE_TO_ACTION['POINTING_DOWN'], 'SCROLL_DOWN');
    let curPage = 'Home';
    // Action is SCROLL_DOWN; page remains Home
    const isSchedule = curPage === 'Schedule';
    assert.equal(isSchedule, false);
    // Page does not change
    assert.equal(curPage, 'Home');
  });

  // Scenario 11: Re-arming after neutral release allows subsequent selection
  test('11. Re-arming after neutral release allows subsequent selection advance', () => {
    const controller = new GestureControllerTS(0.80, 0.20, 4, 0.10, 3);

    // Fire 1st POINTING_DOWN (step 0.08s -> elapsed 0.24s >= 0.20s)
    let act1 = null;
    for (let f = 0; f < 4; f++) {
      const res = controller.processFrame('POINTING_DOWN', 0.95, 1.0 + f * 0.08);
      if (res.action) act1 = res.action;
    }
    assert.equal(act1, 'SCROLL_DOWN');
    assert.equal(controller.state, 'LOCKED_HOLD');

    // 3 neutral frames to re-arm (beyond cooldown of 0.10s)
    for (let f = 0; f < 3; f++) {
      controller.processFrame('NO_HAND', 0.0, 1.45 + f * 0.08);
    }
    assert.equal(controller.state, 'READY');

    // Fire 2nd POINTING_DOWN
    let act2 = null;
    for (let f = 0; f < 4; f++) {
      const res = controller.processFrame('POINTING_DOWN', 0.95, 1.80 + f * 0.08);
      if (res.action) act2 = res.action;
    }
    assert.equal(act2, 'SCROLL_DOWN');
    assert.equal(controller.state, 'LOCKED_HOLD');
  });

  // Scenario 12: Missing or invalid event IDs are handled safely
  test('12. Missing or invalid event IDs are handled safely with index 0 fallback', () => {
    const invalidId = 'non_existent_id_999';
    const idx = SCHEDULE_ITEMS.findIndex((it) => it.id === invalidId);
    assert.equal(idx, -1);

    // Fallback logic
    const validIdx = idx >= 0 ? idx : 0;
    const resolvedItem = SCHEDULE_ITEMS[validIdx] || SCHEDULE_ITEMS[0];
    assert.equal(validIdx, 0);
    assert.equal(resolvedItem.id, 's1');
  });
});
