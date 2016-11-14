/**
 * @file button.js
 */
import ClickableComponent from './clickable-component.js';
import Component from './component';
import log from './utils/log.js';
import assign from 'object.assign';

/**
 * Base class for all buttons
 *
 * @param {Object} player  Main Player
 * @param {Object=} options Object of option names and values
 * @extends ClickableComponent
 * @class Button
 */
class Button extends ClickableComponent {

  /**
   * Create the component's DOM element
   *
   * @param {String=} type Element's node type. e.g. 'div'
   * @param {Object=} props An object of properties that should be set on the element
   * @param {Object=} attributes An object of attributes that should be set on the element
   * @return {Element}
   * @method createEl
   */
  createEl(tag = 'button', props = {}, attributes = {}) {
    props = assign({
      className: this.buildCSSClass()
    }, props);

    if (tag !== 'button') {
      log.warn(`Creating a Button with an HTML element of ${tag} is deprecated; use ClickableComponent instead.`);

      // Add properties for clickable element which is not a native HTML button
      props = assign({
        tabIndex: 0
      }, props);

      // Add ARIA attributes for clickable element which is not a native HTML button
      attributes = assign({
        role: 'button'
      }, attributes);
    }

    // Add attributes for button element
    attributes = assign({

      // Necessary since the default button type is "submit"
      'type': 'button',

      // let the screen reader user know that the text of the button may change
      'aria-live': 'polite'
    }, attributes);

    const el = Component.prototype.createEl.call(this, tag, props, attributes);

    this.createControlTextEl(el);

    return el;
  }

  /**
   * Adds a child component inside this button
   *
   * @param {String|Component} child The class name or instance of a child to add
   * @param {Object=} options Options, including options to be passed to children of the child.
   * @return {Component} The child component (created by this process if a string was used)
   * @deprecated
   * @method addChild
   */
  addChild(child, options = {}) {
    const className = this.constructor.name;

    log.warn(`Adding an actionable (user controllable) child to a Button (${className}) is not supported; use a ClickableComponent instead.`);

    // Avoid the error message generated by ClickableComponent's addChild method
    return Component.prototype.addChild.call(this, child, options);
  }

  /**
   * Enable the button element
   *
   * @return {Component}
   * @method enable
   */
  enable() {
    super.enable();
    this.el_.removeAttribute('disabled');
  }

  /**
   * Disable the button element
   *
   * @return {Component}
   * @method disable
   */
  disable() {
    super.disable();
    this.el_.setAttribute('disabled', 'disabled');
  }

  /**
   * Handle KeyPress (document level) - Extend with specific functionality for button
   *
   * @method handleKeyPress
   */
  handleKeyPress(event) {

    // Ignore Space (32) or Enter (13) key operation, which is handled by the browser for a button.
    if (event.which === 32 || event.which === 13) {
      return;
    }

    // Pass keypress handling up for unsupported keys
    super.handleKeyPress(event);
  }
}

Component.registerComponent('Button', Button);
export default Button;
