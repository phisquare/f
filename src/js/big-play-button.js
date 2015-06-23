import Button from './button.js';
import Component from './component.js';

/* Big Play Button
================================================================================ */
/**
 * Initial play button. Shows before the video has played. The hiding of the
 * big play button is done via CSS and player states.
 *
 * @extends Button
 * @class BigPlayButton
 */
class BigPlayButton extends Button {

  /**
  * Allow sub components to stack CSS class names
  *
  * @return {String} The constructed class name
  * @method buildCSSClass
  */
  buildCSSClass() {
    return 'vjs-big-play-button';
  }

  /**
  * Handles click for play 
  *
  * @method handleClick
  */
  handleClick() {
    this.player_.play();
  }

}

BigPlayButton.prototype.controlText_ = 'Play Video';

Component.registerComponent('BigPlayButton', BigPlayButton);
export default BigPlayButton;
