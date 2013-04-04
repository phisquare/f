/**
 * Core Object/Class for objects that use inheritance + contstructors
 * @constructor
 */
vjs.CoreObject = vjs['CoreObject'] = function(){};
// Manually exporting vjs['CoreObject'] here for Closure Compiler
// because of the use of the extend/create class methods
// If we didn't do this, those functions would get flattend to something like
// `a = ...` and `this.prototype` would refer to the global object instead of
// CoreObject

/**
 * Create a new object that inherits from this Object
 * @param {Object} props Functions and properties to be applied to the
 *                       new object's prototype
 * @return {vjs.CoreObject} Returns an object that inherits from CoreObject
 */
vjs.CoreObject.extend = function(props){
  props = props || {};

  // Create a new function called 'F' which is just an empty object
  function F() {}
  // Inherit from this object's prototype
  F.prototype = this.prototype;

  // Set up the constructor using the supplied init method
  // or using the init of the parent object
  var init = props.init || this.prototype.init || function(){};
  // In Resig's simple class inheritance (previously used) the constructor
  //  is a function that calls `this.init.apply(arguments)`
  // However that would prevent us from using `ParentObject.call(this);`
  //  in a Child constuctor because the `this` in `this.init`
  //  would still refer to the Child and cause an inifinite loop.
  // We would instead have to do
  //    `ParentObject.prototype.init.apply(this, argumnents);`
  //  Bleh. We're not creating a _super() function, so it's good to keep
  //  the parent constructor reference simple.
  var C = function(){
    init.apply(this, arguments);
  };

  // Inherit from F
  C.prototype = new F();
  // Reset the constructor property for C otherwise
  // instances of C would have the constructor of the parent Object
  C.prototype.constructor = C;

  // Make the class extendable
  C.extend = vjs.CoreObject.extend;
  // Make a function for creating instances
  C.create = vjs.CoreObject.create;

  // Extend C's prototype with functions and other properties from props
  for (var name in props) {
    if (props.hasOwnProperty(name)) {
      C.prototype[name] = props[name];
    }
  }

  return C;
};

/**
 * Create a new instace of this Object class
 * @return {vjs.CoreObject} Returns an instance of a CoreObject subclass
 */
vjs.CoreObject.create = function(){
  // Create a new object that inherits from this object's prototype
  var inst = vjs.obj.create(this.prototype);

  // Apply this constructor function to the new object
  this.apply(inst, arguments);

  // Return the new object
  return inst;
};
