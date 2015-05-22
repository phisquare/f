/**
 * @fileoverview Player Component - Base class for all UI objects
 *
 */

import window from 'global/window';
import * as Dom from './utils/dom.js';
import * as Fn from './utils/fn.js';
import * as Guid from './utils/guid.js';
import * as Events from './utils/events.js';
import log from './utils/log.js';
import toTitleCase from './utils/to-title-case.js';
import assign from 'object.assign';
import mergeOptions from './utils/merge-options.js';


/**
 * Base UI Component class
 *
 * Components are embeddable UI objects that are represented by both a
 * javascript object and an element in the DOM. They can be children of other
 * components, and can have many children themselves.
 *
 *     // adding a button to the player
 *     var button = player.addChild('button');
 *     button.el(); // -> button element
 *
 *     <div class="video-js">
 *       <div class="vjs-button">Button</div>
 *     </div>
 *
 * Components are also event emitters.
 *
 *     button.on('click', function(){
 *       console.log('Button Clicked!');
 *     });
 *
 *     button.trigger('customevent');
 *
 * @param {Object} player  Main Player
 * @param {Object=} options
 * @class
 * @constructor
 */
class Component {

  constructor(player, options, ready) {

    // The component might be the player itself and we can't pass `this` to super
    if (!player && this.play) {
      this.player_ = player = this; // eslint-disable-line
    } else {
      this.player_ = player;
    }

    // Make a copy of prototype.options_ to protect against overriding defaults
    this.options_ = mergeOptions({}, this.options_);

    // Updated options with supplied options
    options = this.options(options);

    // Get ID from options or options element if one is supplied
    this.id_ = options.id || (options.el && options.el.id);

    // If there was no ID from the options, generate one
    if (!this.id_) {
      // Don't require the player ID function in the case of mock players
      let id = player && player.id && player.id() || 'no_player';

      this.id_ = `${id}_component_${Guid.newGUID()}`;
    }

    this.name_ = options.name || null;

    // Create element if one wasn't provided in options
    if (options.el) {
      this.el_ = options.el;
    } else if (options.createEl !== false) {
      this.el_ = this.createEl();
    }

    this.children_ = [];
    this.childIndex_ = {};
    this.childNameIndex_ = {};

    // Add any child components in options
    if (options.initChildren !== false) {
      this.initChildren();
    }

    this.ready(ready);
    // Don't want to trigger ready here or it will before init is actually
    // finished for all children that run this constructor

    if (options.reportTouchActivity !== false) {
      this.enableTouchActivity();
    }
  }

  // Temp for ES6 class transition, remove before 5.0
  init() {
    // console.log('init called on Component');
    Component.apply(this, arguments);
  }

  /**
   * Dispose of the component and all child components
   */
  dispose() {
    this.trigger({ type: 'dispose', bubbles: false });

    // Dispose all children.
    if (this.children_) {
      for (let i = this.children_.length - 1; i >= 0; i--) {
        if (this.children_[i].dispose) {
          this.children_[i].dispose();
        }
      }
    }

    // Delete child references
    this.children_ = null;
    this.childIndex_ = null;
    this.childNameIndex_ = null;

    // Remove all event listeners.
    this.off();

    // Remove element from DOM
    if (this.el_.parentNode) {
      this.el_.parentNode.removeChild(this.el_);
    }

    Dom.removeElData(this.el_);
    this.el_ = null;
  }

  /**
   * Return the component's player
   *
   * @return {Player}
   */
  player() {
    return this.player_;
  }

  /**
   * Deep merge of options objects
   *
   * Whenever a property is an object on both options objects
   * the two properties will be merged using mergeOptions.
   *
   * This is used for merging options for child components. We
   * want it to be easy to override individual options on a child
   * component without having to rewrite all the other default options.
   *
   *     Parent.prototype.options_ = {
   *       children: {
   *         'childOne': { 'foo': 'bar', 'asdf': 'fdsa' },
   *         'childTwo': {},
   *         'childThree': {}
   *       }
   *     }
   *     newOptions = {
   *       children: {
   *         'childOne': { 'foo': 'baz', 'abc': '123' }
   *         'childTwo': null,
   *         'childFour': {}
   *       }
   *     }
   *
   *     this.options(newOptions);
   *
   * RESULT
   *
   *     {
   *       children: {
   *         'childOne': { 'foo': 'baz', 'asdf': 'fdsa', 'abc': '123' },
   *         'childTwo': null, // Disabled. Won't be initialized.
   *         'childThree': {},
   *         'childFour': {}
   *       }
   *     }
   *
   * @param  {Object} obj Object of new option values
   * @return {Object}     A NEW object of this.options_ and obj merged
   */
  options(obj) {
    if (!obj) {
      return this.options_;
    }

    this.options_ = mergeOptions(this.options_, obj);
    return this.options_;
  }

  /**
   * Get the component's DOM element
   *
   *     var domEl = myComponent.el();
   *
   * @return {Element}
   */
  el() {
    return this.el_;
  }

  /**
   * Create the component's DOM element
   *
   * @param  {String=} tagName  Element's node type. e.g. 'div'
   * @param  {Object=} attributes An object of element attributes that should be set on the element
   * @return {Element}
   */
  createEl(tagName, attributes) {
    return Dom.createEl(tagName, attributes);
  }

  localize(string) {
    let code = this.player_.language && this.player_.language();
    let languages = this.player_.languages && this.player_.languages();

    if (!code || !languages) {
      return string;
    }

    let language = languages[code];

    if (language && language[string]) {
      return language[string];
    }

    let primaryCode = code.split('-')[0];
    let primaryLang = languages[primaryCode];

    if (primaryLang && primaryLang[string]) {
      return primaryLang[string];
    }

    return string;
  }

  /**
   * Return the component's DOM element where children are inserted.
   * Will either be the same as el() or a new element defined in createEl().
   *
   * @return {Element}
   */
  contentEl() {
    return this.contentEl_ || this.el_;
  }

  /**
   * Get the component's ID
   *
   *     var id = myComponent.id();
   *
   * @return {String}
   */
  id() {
    return this.id_;
  }

  /**
   * Get the component's name. The name is often used to reference the component.
   *
   *     var name = myComponent.name();
   *
   * @return {String}
   */
  name() {
    return this.name_;
  }

  /**
   * Get an array of all child components
   *
   *     var kids = myComponent.children();
   *
   * @return {Array} The children
   */
  children() {
    return this.children_;
  }

  /**
   * Returns a child component with the provided ID
   *
   * @return {Component}
   */
  getChildById(id) {
    return this.childIndex_[id];
  }

  /**
   * Returns a child component with the provided name
   *
   * @return {Component}
   */
  getChild(name) {
    return this.childNameIndex_[name];
  }

  /**
   * Adds a child component inside this component
   *
   *     myComponent.el();
   *     // -> <div class='my-component'></div>
   *     myComponent.children();
   *     // [empty array]
   *
   *     var myButton = myComponent.addChild('MyButton');
   *     // -> <div class='my-component'><div class="my-button">myButton<div></div>
   *     // -> myButton === myComonent.children()[0];
   *
   * Pass in options for child constructors and options for children of the child
   *
   *     var myButton = myComponent.addChild('MyButton', {
   *       text: 'Press Me',
   *       children: {
   *         buttonChildExample: {
   *           buttonChildOption: true
   *         }
   *       }
   *     });
   *
   * @param {String|Component} child The class name or instance of a child to add
   * @param {Object=} options Options, including options to be passed to children of the child.
   * @return {Component} The child component (created by this process if a string was used)
   * @suppress {accessControls|checkRegExp|checkTypes|checkVars|const|constantProperty|deprecated|duplicate|es5Strict|fileoverviewTags|globalThis|invalidCasts|missingProperties|nonStandardJsDocs|strictModuleDepCheck|undefinedNames|undefinedVars|unknownDefines|uselessCode|visibility}
   */
  addChild(child, options={}) {
    let component;
    let componentName;

    // If child is a string, create nt with options
    if (typeof child === 'string') {
      componentName = child;

      // Options can also be specified as a boolean, so convert to an empty object if false.
      if (!options) {
        options = {};
      }

      // Same as above, but true is deprecated so show a warning.
      if (options === true) {
        log.warn('Initializing a child component with `true` is deprecated. Children should be defined in an array when possible, but if necessary use an object instead of `true`.');
        options = {};
      }

      // If no componentClass in options, assume componentClass is the name lowercased
      // (e.g. playButton)
      let componentClassName = options.componentClass || toTitleCase(componentName);

      // Set name through options
      options.name = componentName;

      // Create a new object & element for this controls set
      // If there's no .player_, this is a player
      let ComponentClass = Component.getComponent(componentClassName);

      component = new ComponentClass(this.player_ || this, options);

    // child is a component instance
    } else {
      component = child;
    }

    this.children_.push(component);

    if (typeof component.id === 'function') {
      this.childIndex_[component.id()] = component;
    }

    // If a name wasn't used to create the component, check if we can use the
    // name function of the component
    componentName = componentName || (component.name && component.name());

    if (componentName) {
      this.childNameIndex_[componentName] = component;
    }

    // Add the UI object's element to the container div (box)
    // Having an element is not required
    if (typeof component.el === 'function' && component.el()) {
      this.contentEl().appendChild(component.el());
    }

    // Return so it can stored on parent object if desired.
    return component;
  }

  /**
   * Remove a child component from this component's list of children, and the
   * child component's element from this component's element
   *
   * @param  {Component} component Component to remove
   */
  removeChild(component) {
    if (typeof component === 'string') {
      component = this.getChild(component);
    }

    if (!component || !this.children_) {
      return;
    }

    let childFound = false;

    for (let i = this.children_.length - 1; i >= 0; i--) {
      if (this.children_[i] === component) {
        childFound = true;
        this.children_.splice(i, 1);
        break;
      }
    }

    if (!childFound) {
      return;
    }

    this.childIndex_[component.id()] = null;
    this.childNameIndex_[component.name()] = null;

    let compEl = component.el();

    if (compEl && compEl.parentNode === this.contentEl()) {
      this.contentEl().removeChild(component.el());
    }
  }

  /**
   * Add and initialize default child components from options
   *
   *     // when an instance of MyComponent is created, all children in options
   *     // will be added to the instance by their name strings and options
   *     MyComponent.prototype.options_.children = {
   *       myChildComponent: {
   *         myChildOption: true
   *       }
   *     }
   *
   *     // Or when creating the component
   *     var myComp = new MyComponent(player, {
   *       children: {
   *         myChildComponent: {
   *           myChildOption: true
   *         }
   *       }
   *     });
   *
   * The children option can also be an Array of child names or
   * child options objects (that also include a 'name' key).
   *
   *     var myComp = new MyComponent(player, {
   *       children: [
   *         'button',
   *         {
   *           name: 'button',
   *           someOtherOption: true
   *         }
   *       ]
   *     });
   *
   */
  initChildren() {
    let children = this.options_.children;

    if (children) {
      // `this` is `parent`
      let parentOptions = this.options();
      let handleAdd = (name, opts) => {
        // Allow options for children to be set at the parent options
        // e.g. videojs(id, { controlBar: false });
        // instead of videojs(id, { children: { controlBar: false });
        if (parentOptions[name] !== undefined) {
          opts = parentOptions[name];
        }

        // Allow for disabling default components
        // e.g. options['children']['posterImage'] = false
        if (opts === false) {
          return;
        }

        // Create and add the child component.
        // Add a direct reference to the child by name on the parent instance.
        // If two of the same component are used, different names should be supplied
        // for each
        this[name] = this.addChild(name, opts);
      };

      // Allow for an array of children details to passed in the options
      if (Array.isArray(children)) {
        for (let i = 0; i < children.length; i++) {
          let child = children[i];
          let name;
          let opts;

          if (typeof child === 'string') {
            // ['myComponent']
            name = child;
            opts = {};
          } else {
            // [{ name: 'myComponent', otherOption: true }]
            name = child.name;
            opts = child;
          }

          handleAdd(name, opts);
        }
      } else {
        Object.getOwnPropertyNames(children).forEach(function(name){
          handleAdd(name, children[name]);
        });
      }
    }
  }

  /**
   * Allows sub components to stack CSS class names
   *
   * @return {String} The constructed class name
   */
  buildCSSClass() {
    // Child classes can include a function that does:
    // return 'CLASS NAME' + this._super();
    return '';
  }

  /**
   * Add an event listener to this component's element
   *
   *     var myFunc = function(){
   *       var myComponent = this;
   *       // Do something when the event is fired
   *     };
   *
   *     myComponent.on('eventType', myFunc);
   *
   * The context of myFunc will be myComponent unless previously bound.
   *
   * Alternatively, you can add a listener to another element or component.
   *
   *     myComponent.on(otherElement, 'eventName', myFunc);
   *     myComponent.on(otherComponent, 'eventName', myFunc);
   *
   * The benefit of using this over `VjsEvents.on(otherElement, 'eventName', myFunc)`
   * and `otherComponent.on('eventName', myFunc)` is that this way the listeners
   * will be automatically cleaned up when either component is disposed.
   * It will also bind myComponent as the context of myFunc.
   *
   * **NOTE**: When using this on elements in the page other than window
   * and document (both permanent), if you remove the element from the DOM
   * you need to call `myComponent.trigger(el, 'dispose')` on it to clean up
   * references to it and allow the browser to garbage collect it.
   *
   * @param  {String|Component} first   The event type or other component
   * @param  {Function|String}      second  The event handler or event type
   * @param  {Function}             third   The event handler
   * @return {Component}        self
   */
  on(first, second, third) {
    if (typeof first === 'string' || Array.isArray(first)) {
      Events.on(this.el_, first, Fn.bind(this, second));

    // Targeting another component or element
    } else {
      const target = first;
      const type = second;
      const fn = Fn.bind(this, third);

      // When this component is disposed, remove the listener from the other component
      const removeOnDispose = () => this.off(target, type, fn);

      // Use the same function ID so we can remove it later it using the ID
      // of the original listener
      removeOnDispose.guid = fn.guid;
      this.on('dispose', removeOnDispose);

      // If the other component is disposed first we need to clean the reference
      // to the other component in this component's removeOnDispose listener
      // Otherwise we create a memory leak.
      const cleanRemover = () => this.off('dispose', removeOnDispose);

      // Add the same function ID so we can easily remove it later
      cleanRemover.guid = fn.guid;

      // Check if this is a DOM node
      if (first.nodeName) {
        // Add the listener to the other element
        Events.on(target, type, fn);
        Events.on(target, 'dispose', cleanRemover);

      // Should be a component
      // Not using `instanceof Component` because it makes mock players difficult
      } else if (typeof first.on === 'function') {
        // Add the listener to the other component
        target.on(type, fn);
        target.on('dispose', cleanRemover);
      }
    }

    return this;
  }

  /**
   * Remove an event listener from this component's element
   *
   *     myComponent.off('eventType', myFunc);
   *
   * If myFunc is excluded, ALL listeners for the event type will be removed.
   * If eventType is excluded, ALL listeners will be removed from the component.
   *
   * Alternatively you can use `off` to remove listeners that were added to other
   * elements or components using `myComponent.on(otherComponent...`.
   * In this case both the event type and listener function are REQUIRED.
   *
   *     myComponent.off(otherElement, 'eventType', myFunc);
   *     myComponent.off(otherComponent, 'eventType', myFunc);
   *
   * @param  {String=|Component}  first  The event type or other component
   * @param  {Function=|String}       second The listener function or event type
   * @param  {Function=}              third  The listener for other component
   * @return {Component}
   */
  off(first, second, third) {
    if (!first || typeof first === 'string' || Array.isArray(first)) {
      Events.off(this.el_, first, second);
    } else {
      const target = first;
      const type = second;
      // Ensure there's at least a guid, even if the function hasn't been used
      const fn = Fn.bind(this, third);

      // Remove the dispose listener on this component,
      // which was given the same guid as the event listener
      this.off('dispose', fn);

      if (first.nodeName) {
        // Remove the listener
        Events.off(target, type, fn);
        // Remove the listener for cleaning the dispose listener
        Events.off(target, 'dispose', fn);
      } else {
        target.off(type, fn);
        target.off('dispose', fn);
      }
    }

    return this;
  }

  /**
   * Add an event listener to be triggered only once and then removed
   *
   *     myComponent.one('eventName', myFunc);
   *
   * Alternatively you can add a listener to another element or component
   * that will be triggered only once.
   *
   *     myComponent.one(otherElement, 'eventName', myFunc);
   *     myComponent.one(otherComponent, 'eventName', myFunc);
   *
   * @param  {String|Component}  first   The event type or other component
   * @param  {Function|String}       second  The listener function or event type
   * @param  {Function=}             third   The listener function for other component
   * @return {Component}
   */
  one(first, second, third) {
    if (typeof first === 'string' || Array.isArray(first)) {
      Events.one(this.el_, first, Fn.bind(this, second));
    } else {
      const target = first;
      const type = second;
      const fn = Fn.bind(this, third);

      const newFunc = () => {
        this.off(target, type, newFunc);
        fn.apply(null, arguments);
      };

      // Keep the same function ID so we can remove it later
      newFunc.guid = fn.guid;

      this.on(target, type, newFunc);
    }

    return this;
  }

  /**
   * Trigger an event on an element
   *
   *     myComponent.trigger('eventName');
   *     myComponent.trigger({'type':'eventName'});
   *     myComponent.trigger('eventName', {data: 'some data'});
   *     myComponent.trigger({'type':'eventName'}, {data: 'some data'});
   *
   * @param  {Event|Object|String} event  A string (the type) or an event object with a type attribute
   * @param  {Object} [hash] data hash to pass along with the event
   * @return {Component}       self
   */
  trigger(event, hash) {
    Events.trigger(this.el_, event, hash);
    return this;
  }

  /**
   * Bind a listener to the component's ready state
   *
   * Different from event listeners in that if the ready event has already happened
   * it will trigger the function immediately.
   *
   * @param  {Function} fn Ready listener
   * @return {Component}
   */
  ready(fn) {
    if (fn) {
      if (this.isReady_) {
        fn.call(this);
      } else {
        this.readyQueue_ = this.readyQueue_ || [];
        this.readyQueue_.push(fn);
      }
    }
    return this;
  }

  /**
   * Trigger the ready listeners
   *
   * @return {Component}
   */
  triggerReady() {
    this.isReady_ = true;

    let readyQueue = this.readyQueue_;

    if (readyQueue && readyQueue.length > 0) {

      for (let i = 0; i < readyQueue.length; i++) {
        readyQueue[i].call(this);
      }

      // Reset Ready Queue
      this.readyQueue_ = [];

      // Allow for using event listeners also, in case you want to do something everytime a source is ready.
      this.trigger('ready');
    }
  }

  /**
   * Check if a component's element has a CSS class name
   *
   * @param {String} classToCheck Classname to check
   * @return {Component}
   */
  hasClass(classToCheck) {
    return Dom.hasElClass(this.el_, classToCheck);
  }

  /**
   * Add a CSS class name to the component's element
   *
   * @param {String} classToAdd Classname to add
   * @return {Component}
   */
  addClass(classToAdd) {
    Dom.addElClass(this.el_, classToAdd);
    return this;
  }

  /**
   * Remove a CSS class name from the component's element
   *
   * @param {String} classToRemove Classname to remove
   * @return {Component}
   */
  removeClass(classToRemove) {
    Dom.removeElClass(this.el_, classToRemove);
    return this;
  }

  /**
   * Show the component element if hidden
   *
   * @return {Component}
   */
  show() {
    this.removeClass('vjs-hidden');
    return this;
  }

  /**
   * Hide the component element if currently showing
   *
   * @return {Component}
   */
  hide() {
    this.addClass('vjs-hidden');
    return this;
  }

  /**
   * Lock an item in its visible state
   * To be used with fadeIn/fadeOut.
   *
   * @return {Component}
   * @private
   */
  lockShowing() {
    this.addClass('vjs-lock-showing');
    return this;
  }

  /**
   * Unlock an item to be hidden
   * To be used with fadeIn/fadeOut.
   *
   * @return {Component}
   * @private
   */
  unlockShowing() {
    this.removeClass('vjs-lock-showing');
    return this;
  }

  /**
   * Set or get the width of the component (CSS values)
   *
   * Setting the video tag dimension values only works with values in pixels.
   * Percent values will not work.
   * Some percents can be used, but width()/height() will return the number + %,
   * not the actual computed width/height.
   *
   * @param  {Number|String=} num   Optional width number
   * @param  {Boolean} skipListeners Skip the 'resize' event trigger
   * @return {Component} This component, when setting the width
   * @return {Number|String} The width, when getting
   */
  width(num, skipListeners) {
    return this.dimension('width', num, skipListeners);
  }

  /**
   * Get or set the height of the component (CSS values)
   *
   * Setting the video tag dimension values only works with values in pixels.
   * Percent values will not work.
   * Some percents can be used, but width()/height() will return the number + %,
   * not the actual computed width/height.
   *
   * @param  {Number|String=} num     New component height
   * @param  {Boolean=} skipListeners Skip the resize event trigger
   * @return {Component} This component, when setting the height
   * @return {Number|String} The height, when getting
   */
  height(num, skipListeners) {
    return this.dimension('height', num, skipListeners);
  }

  /**
   * Set both width and height at the same time
   *
   * @param  {Number|String} width
   * @param  {Number|String} height
   * @return {Component} The component
   */
  dimensions(width, height) {
    // Skip resize listeners on width for optimization
    return this.width(width, true).height(height);
  }

  /**
   * Get or set width or height
   *
   * This is the shared code for the width() and height() methods.
   * All for an integer, integer + 'px' or integer + '%';
   *
   * Known issue: Hidden elements officially have a width of 0. We're defaulting
   * to the style.width value and falling back to computedStyle which has the
   * hidden element issue. Info, but probably not an efficient fix:
   * http://www.foliotek.com/devblog/getting-the-width-of-a-hidden-element-with-jquery-using-width/
   *
   * @param  {String} widthOrHeight  'width' or 'height'
   * @param  {Number|String=} num     New dimension
   * @param  {Boolean=} skipListeners Skip resize event trigger
   * @return {Component} The component if a dimension was set
   * @return {Number|String} The dimension if nothing was set
   * @private
   */
  dimension(widthOrHeight, num, skipListeners) {
    if (num !== undefined) {
      // Set to zero if null or literally NaN (NaN !== NaN)
      if (num === null || num !== num) {
        num = 0;
      }

      // Check if using css width/height (% or px) and adjust
      if (('' + num).indexOf('%') !== -1 || ('' + num).indexOf('px') !== -1) {
        this.el_.style[widthOrHeight] = num;
      } else if (num === 'auto') {
        this.el_.style[widthOrHeight] = '';
      } else {
        this.el_.style[widthOrHeight] = num + 'px';
      }

      // skipListeners allows us to avoid triggering the resize event when setting both width and height
      if (!skipListeners) {
        this.trigger('resize');
      }

      // Return component
      return this;
    }

    // Not setting a value, so getting it
    // Make sure element exists
    if (!this.el_) {
      return 0;
    }

    // Get dimension value from style
    let val = this.el_.style[widthOrHeight];
    let pxIndex = val.indexOf('px');

    if (pxIndex !== -1) {
      // Return the pixel value with no 'px'
      return parseInt(val.slice(0, pxIndex), 10);
    }

    // No px so using % or no style was set, so falling back to offsetWidth/height
    // If component has display:none, offset will return 0
    // TODO: handle display:none and no dimension style using px
    return parseInt(this.el_['offset' + toTitleCase(widthOrHeight)], 10);
  }

  /**
   * Emit 'tap' events when touch events are supported
   *
   * This is used to support toggling the controls through a tap on the video.
   *
   * We're requiring them to be enabled because otherwise every component would
   * have this extra overhead unnecessarily, on mobile devices where extra
   * overhead is especially bad.
   * @private
   */
  emitTapEvents() {
    // Track the start time so we can determine how long the touch lasted
    let touchStart = 0;
    let firstTouch = null;

    // Maximum movement allowed during a touch event to still be considered a tap
    // Other popular libs use anywhere from 2 (hammer.js) to 15, so 10 seems like a nice, round number.
    const tapMovementThreshold = 10;

    // The maximum length a touch can be while still being considered a tap
    const touchTimeThreshold = 200;

    let couldBeTap;

    this.on('touchstart', function(event) {
      // If more than one finger, don't consider treating this as a click
      if (event.touches.length === 1) {
        // Copy the touches object to prevent modifying the original
        firstTouch = assign({}, event.touches[0]);
        // Record start time so we can detect a tap vs. "touch and hold"
        touchStart = new Date().getTime();
        // Reset couldBeTap tracking
        couldBeTap = true;
      }
    });

    this.on('touchmove', function(event) {
      // If more than one finger, don't consider treating this as a click
      if (event.touches.length > 1) {
        couldBeTap = false;
      } else if (firstTouch) {
        // Some devices will throw touchmoves for all but the slightest of taps.
        // So, if we moved only a small distance, this could still be a tap
        const xdiff = event.touches[0].pageX - firstTouch.pageX;
        const ydiff = event.touches[0].pageY - firstTouch.pageY;
        const touchDistance = Math.sqrt(xdiff * xdiff + ydiff * ydiff);

        if (touchDistance > tapMovementThreshold) {
          couldBeTap = false;
        }
      }
    });

    const noTap = function() {
      couldBeTap = false;
    };

    // TODO: Listen to the original target. http://youtu.be/DujfpXOKUp8?t=13m8s
    this.on('touchleave', noTap);
    this.on('touchcancel', noTap);

    // When the touch ends, measure how long it took and trigger the appropriate
    // event
    this.on('touchend', function(event) {
      firstTouch = null;
      // Proceed only if the touchmove/leave/cancel event didn't happen
      if (couldBeTap === true) {
        // Measure how long the touch lasted
        const touchTime = new Date().getTime() - touchStart;

        // Make sure the touch was less than the threshold to be considered a tap
        if (touchTime < touchTimeThreshold) {
          // Don't let browser turn this into a click
          event.preventDefault();
          this.trigger('tap');
          // It may be good to copy the touchend event object and change the
          // type to tap, if the other event properties aren't exact after
          // Events.fixEvent runs (e.g. event.target)
        }
      }
    });
  }

  /**
   * Report user touch activity when touch events occur
   *
   * User activity is used to determine when controls should show/hide. It's
   * relatively simple when it comes to mouse events, because any mouse event
   * should show the controls. So we capture mouse events that bubble up to the
   * player and report activity when that happens.
   *
   * With touch events it isn't as easy. We can't rely on touch events at the
   * player level, because a tap (touchstart + touchend) on the video itself on
   * mobile devices is meant to turn controls off (and on). User activity is
   * checked asynchronously, so what could happen is a tap event on the video
   * turns the controls off, then the touchend event bubbles up to the player,
   * which if it reported user activity, would turn the controls right back on.
   * (We also don't want to completely block touch events from bubbling up)
   *
   * Also a touchmove, touch+hold, and anything other than a tap is not supposed
   * to turn the controls back on on a mobile device.
   *
   * Here we're setting the default component behavior to report user activity
   * whenever touch events happen, and this can be turned off by components that
   * want touch events to act differently.
   */
  enableTouchActivity() {
    // Don't continue if the root player doesn't support reporting user activity
    if (!this.player() || !this.player().reportUserActivity) {
      return;
    }

    // listener for reporting that the user is active
    const report = Fn.bind(this.player(), this.player().reportUserActivity);

    let touchHolding;

    this.on('touchstart', function() {
      report();
      // For as long as the they are touching the device or have their mouse down,
      // we consider them active even if they're not moving their finger or mouse.
      // So we want to continue to update that they are active
      this.clearInterval(touchHolding);
      // report at the same interval as activityCheck
      touchHolding = this.setInterval(report, 250);
    });

    const touchEnd = function(event) {
      report();
      // stop the interval that maintains activity if the touch is holding
      this.clearInterval(touchHolding);
    };

    this.on('touchmove', report);
    this.on('touchend', touchEnd);
    this.on('touchcancel', touchEnd);
  }

  /**
   * Creates timeout and sets up disposal automatically.
   * @param {Function} fn The function to run after the timeout.
   * @param {Number} timeout Number of ms to delay before executing specified function.
   * @return {Number} Returns the timeout ID
   */
  setTimeout(fn, timeout) {
    fn = Fn.bind(this, fn);

    // window.setTimeout would be preferable here, but due to some bizarre issue with Sinon and/or Phantomjs, we can't.
    let timeoutId = window.setTimeout(fn, timeout);

    const disposeFn = function() {
      this.clearTimeout(timeoutId);
    };

    disposeFn.guid = `vjs-timeout-${timeoutId}`;

    this.on('dispose', disposeFn);

    return timeoutId;
  }

  /**
   * Clears a timeout and removes the associated dispose listener
   * @param {Number} timeoutId The id of the timeout to clear
   * @return {Number} Returns the timeout ID
   */
  clearTimeout(timeoutId) {
    window.clearTimeout(timeoutId);

    const disposeFn = function() {};

    disposeFn.guid = `vjs-timeout-${timeoutId}`;

    this.off('dispose', disposeFn);

    return timeoutId;
  }

  /**
   * Creates an interval and sets up disposal automatically.
   * @param {Function} fn The function to run every N seconds.
   * @param {Number} interval Number of ms to delay before executing specified function.
   * @return {Number} Returns the interval ID
   */
  setInterval(fn, interval) {
    fn = Fn.bind(this, fn);

    let intervalId = window.setInterval(fn, interval);

    const disposeFn = function() {
      this.clearInterval(intervalId);
    };

    disposeFn.guid = `vjs-interval-${intervalId}`;

    this.on('dispose', disposeFn);

    return intervalId;
  }

  /**
   * Clears an interval and removes the associated dispose listener
   * @param {Number} intervalId The id of the interval to clear
   * @return {Number} Returns the interval ID
   */
  clearInterval(intervalId) {
    window.clearInterval(intervalId);

    const disposeFn = function() {};

    disposeFn.guid = `vjs-interval-${intervalId}`;

    this.off('dispose', disposeFn);

    return intervalId;
  }

  static registerComponent(name, comp) {
    if (!Component.components_) {
      Component.components_ = {};
    }

    Component.components_[name] = comp;
    return comp;
  }

  static getComponent(name) {
    if (Component.components_ && Component.components_[name]) {
      return Component.components_[name];
    }

    if (window && window.videojs && window.videojs[name]) {
      log.warn(`The ${name} component was added to the videojs object when it should be registered using videojs.registerComponent(name, component)`);
      return window.videojs[name];
    }
  }

  static extend(props) {
    props = props || {};
    // Set up the constructor using the supplied init method
    // or using the init of the parent object
    // Make sure to check the unobfuscated version for external libs
    let init = props.init || props.init || this.prototype.init || this.prototype.init || function() {};
    // In Resig's simple class inheritance (previously used) the constructor
    //  is a function that calls `this.init.apply(arguments)`
    // However that would prevent us from using `ParentObject.call(this);`
    //  in a Child constructor because the `this` in `this.init`
    //  would still refer to the Child and cause an infinite loop.
    // We would instead have to do
    //    `ParentObject.prototype.init.apply(this, arguments);`
    //  Bleh. We're not creating a _super() function, so it's good to keep
    //  the parent constructor reference simple.
    let subObj = function() {
      init.apply(this, arguments);
    };

    // Inherit from this object's prototype
    subObj.prototype = Object.create(this.prototype);
    // Reset the constructor property for subObj otherwise
    // instances of subObj would have the constructor of the parent Object
    subObj.prototype.constructor = subObj;

    // Make the class extendable
    subObj.extend = Component.extend;
    // Make a function for creating instances
    // subObj.create = CoreObject.create;

    // Extend subObj's prototype with functions and other properties from props
    for (let name in props) {
      if (props.hasOwnProperty(name)) {
        subObj.prototype[name] = props[name];
      }
    }

    return subObj;
  }
}

Component.registerComponent('Component', Component);
export default Component;
