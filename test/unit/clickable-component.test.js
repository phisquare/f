/* eslint-env qunit */
import { useFakeTimers } from 'sinon';
import ClickableComponent from '../../src/js/clickable-component.js';
import TestHelpers from './test-helpers.js';
import * as Events from '../../src/js/utils/events.js';

QUnit.module('ClickableComponent', {
  beforeEach() {
    this.clock = useFakeTimers();
  },

  afterEach() {
    this.clock.restore();
  }
});

QUnit.test('should create a div with role="button"', function(assert) {
  assert.expect(2);

  const player = TestHelpers.makePlayer({});

  const testClickableComponent = new ClickableComponent(player);
  const el = testClickableComponent.createEl();

  assert.equal(el.nodeName.toLowerCase(), 'div', 'the name of the element is "div"');
  assert.equal(el.getAttribute('role').toLowerCase(), 'button', 'the role of the element is "button"');

  testClickableComponent.dispose();
  player.dispose();
});

QUnit.test('should be enabled/disabled', function(assert) {
  assert.expect(3);

  const player = TestHelpers.makePlayer({});

  const testClickableComponent = new ClickableComponent(player);

  assert.equal(testClickableComponent.hasClass('vjs-disabled'), false, 'ClickableComponent defaults to enabled');

  testClickableComponent.disable();

  assert.equal(testClickableComponent.hasClass('vjs-disabled'), true, 'ClickableComponent is disabled');

  testClickableComponent.enable();

  assert.equal(testClickableComponent.hasClass('vjs-disabled'), false, 'ClickableComponent is enabled');

  testClickableComponent.dispose();
  player.dispose();
});

QUnit.test('handleClick should not be triggered when disabled', function(assert) {
  let clicks = 0;

  class TestClickableComponent extends ClickableComponent {
    handleClick() {
      clicks++;
    }
  }

  const player = TestHelpers.makePlayer({});
  const testClickableComponent = new TestClickableComponent(player);
  const el = testClickableComponent.el();

  // 1st click
  Events.trigger(el, 'click');
  assert.equal(clicks, 1, 'click on enabled ClickableComponent is handled');

  testClickableComponent.disable();
  // No click should happen.
  Events.trigger(el, 'click');
  assert.equal(clicks, 1, 'click on disabled ClickableComponent is not handled');

  testClickableComponent.enable();
  // 2nd Click
  Events.trigger(el, 'click');
  assert.equal(clicks, 2, 'click on re-enabled ClickableComponent is handled');

  testClickableComponent.dispose();
  player.dispose();
});

QUnit.test('handleClick should not be triggered more than once when enabled', function(assert) {
  let clicks = 0;

  class TestClickableComponent extends ClickableComponent {
    handleClick() {
      clicks++;
    }
  }

  const player = TestHelpers.makePlayer({});
  const testClickableComponent = new TestClickableComponent(player);
  const el = testClickableComponent.el();

  testClickableComponent.enable();
  // Click should still be handled just once
  Events.trigger(el, 'click');
  assert.equal(clicks, 1, 'no additional click handler when already enabled ClickableComponent has been enabled again');

  testClickableComponent.dispose();
  player.dispose();
});

QUnit.test('handleClick should use handler from options', function(assert) {
  let clicks = 0;

  const player = TestHelpers.makePlayer({});
  const testClickableComponent = new ClickableComponent(player, {
    clickHandler() {
      clicks++;
    }
  });
  const el = testClickableComponent.el();

  Events.trigger(el, 'click');
  assert.equal(clicks, 1, 'options handler was called');

  testClickableComponent.dispose();
  player.dispose();
});

QUnit.test('language change should localize its text', function(assert) {
  assert.expect(2);

  const player = TestHelpers.makePlayer({
    languages: {
      es: {
        Play: 'Juego'
      },
      en: {
        Play: 'Play'
      }
    }
  });

  const testClickableComponent = new ClickableComponent(player);

  testClickableComponent.controlText_ = 'Play';
  const el = testClickableComponent.createEl();

  player.language('en');
  assert.equal(el.querySelector('.vjs-control-text').textContent, 'Play', 'text localized');

  player.language('es');
  assert.equal(el.querySelector('.vjs-control-text').textContent, 'Juego', 'text localized');

  testClickableComponent.dispose();
  player.dispose();
});

QUnit.test('class and text should be settable from options', function(assert) {
  const player = TestHelpers.makePlayer({});
  const testClickableComponent = new ClickableComponent(player, {
    className: 'class1',
    controlText: 'some text'
  });

  assert.equal(testClickableComponent.controlText(), 'some text', 'text was set');
  assert.ok(testClickableComponent.hasClass('class1'), 'class was set');

  testClickableComponent.dispose();
  player.dispose();
});

QUnit.test('should respect throttle option', function(assert) {
  assert.expect(8);
  let clicks = 0;

  class ThrottlableComponent extends ClickableComponent {
    constructor(player, options) {
      super(player, options);
    }
    handleClick() {
      clicks++;
    }
  }

  const player = TestHelpers.makePlayer({});
  const noThrottleComponent = new ThrottlableComponent(player);
  const throttledComponent = new ThrottlableComponent(player, {throttle: true});
  const customThrottledComponent1 = new ThrottlableComponent(player, {throttle: 10 });
  const customThrottledComponent2 = new ThrottlableComponent(player, {throttle: 0 });
  const noThrottleEl = noThrottleComponent.el();
  const throttledEl = throttledComponent.el();
  const customThrottledEl1 = customThrottledComponent1.el();
  const customThrottledEl2 = customThrottledComponent2.el();

  const testThrottledClicks = (el, wait, elName) => {
    clicks = 0;
    // We need to wait for the durarion of the throttle wait
    // parameter before proceeding to test throttled functions
    this.clock.tick(wait);
    Events.trigger(el, 'click');
    assert.equal(clicks, 1, `${elName}: First click is handled`);
    Events.trigger(el, 'click');
    assert.equal(clicks, 1, `${elName}: Second click is ignored`);
    // allow time before next click
    this.clock.tick(wait);
    Events.trigger(el, 'click');
    assert.equal(clicks, 2, `${elName}: third click is handled`);
  };

  // 2 instantaneous clicks on non-throttled el
  Events.trigger(noThrottleEl, 'click');
  Events.trigger(noThrottleEl, 'click');
  assert.equal(clicks, 2, 'click on enabled ClickableComponent is handled twice');

  clicks = 0;
  // 0 wait is not throttled
  Events.trigger(customThrottledEl2, 'click');
  Events.trigger(customThrottledEl2, 'click');
  assert.equal(clicks, 2, 'click on enabled ClickableComponent with wait of 0 is handled twice');

  testThrottledClicks(throttledEl, 50, 'default wait');
  testThrottledClicks(customThrottledEl1, 10, '10ms wait');
});
