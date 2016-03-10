import TrackBaseline from './track-baseline';
import TechFaker from '../tech/tech-faker';
import TextTrack from '../../../src/js/tracks/text-track.js';
import TestHelpers from '../test-helpers.js';

const defaultTech = {
  textTracks() {},
  on() {},
  off() {},
  currentTime() {}
};
q.module('Text Track');

// do baseline track testing
TrackBaseline(TextTrack, {
  id: '1',
  kind: 'subtitles',
  mode: 'disabled',
  label: 'English',
  language: 'en',
  tech: defaultTech
});

test('can create a TextTrack with a mode property', function() {
  let mode = 'disabled';
  let tt = new TextTrack({
    mode,
    tech: defaultTech
  });

  equal(tt.mode, mode, 'we have a mode');
});

test('defaults when items not provided', function() {
  let tt = new TextTrack({
    tech: TechFaker
  });

  equal(tt.kind, 'subtitles', 'kind defaulted to subtitles');
  equal(tt.mode, 'disabled', 'mode defaulted to disabled');
  equal(tt.label, '', 'label defaults to empty string');
  equal(tt.language, '', 'language defaults to empty string');
});

test('kind can only be one of several options, defaults to subtitles', function() {
  let tt = new TextTrack({
    tech: defaultTech,
    kind: 'foo'
  });

  equal(tt.kind, 'subtitles', 'the kind is set to subtitles, not foo');
  notEqual(tt.kind, 'foo', 'the kind is set to subtitles, not foo');

  tt = new TextTrack({
    tech: defaultTech,
    kind: 'subtitles'
  });

  equal(tt.kind, 'subtitles', 'the kind is set to subtitles');

  tt = new TextTrack({
    tech: defaultTech,
    kind: 'captions'
  });

  equal(tt.kind, 'captions', 'the kind is set to captions');

  tt = new TextTrack({
    tech: defaultTech,
    kind: 'descriptions'
  });

  equal(tt.kind, 'descriptions', 'the kind is set to descriptions');

  tt = new TextTrack({
    tech: defaultTech,
    kind: 'chapters'
  });

  equal(tt.kind, 'chapters', 'the kind is set to chapters');

  tt = new TextTrack({
    tech: defaultTech,
    kind: 'metadata'
  });

  equal(tt.kind, 'metadata', 'the kind is set to metadata');
});

test('mode can only be one of several options, defaults to disabled', function() {
  let tt = new TextTrack({
    tech: defaultTech,
    mode: 'foo'
  });

  equal(tt.mode, 'disabled', 'the mode is set to disabled, not foo');
  notEqual(tt.mode, 'foo', 'the mode is set to disabld, not foo');

  tt = new TextTrack({
    tech: defaultTech,
    mode: 'disabled'
  });

  equal(tt.mode, 'disabled', 'the mode is set to disabled');

  tt = new TextTrack({
    tech: defaultTech,
    mode: 'hidden'
  });

  equal(tt.mode, 'hidden', 'the mode is set to hidden');

  tt = new TextTrack({
    tech: defaultTech,
    mode: 'showing'
  });

  equal(tt.mode, 'showing', 'the mode is set to showing');
});

test('cue and activeCues are read only', function() {
  let mode = 'disabled';
  let tt = new TextTrack({
    mode,
    tech: defaultTech,
  });

  tt.cues = 'foo';
  tt.activeCues = 'bar';

  notEqual(tt.cues, 'foo', 'cues is still original value');
  notEqual(tt.activeCues, 'bar', 'activeCues is still original value');
});

test('mode can only be set to a few options', function() {
  let tt = new TextTrack({
    tech: defaultTech
  });

  tt.mode = 'foo';

  notEqual(tt.mode, 'foo', 'the mode is still the old value, disabled');
  equal(tt.mode, 'disabled', 'still on the default mode, disabled');

  tt.mode = 'hidden';
  equal(tt.mode, 'hidden', 'mode set to hidden');

  tt.mode = 'bar';
  notEqual(tt.mode, 'bar', 'the mode is still the old value, hidden');
  equal(tt.mode, 'hidden', 'still on the previous mode, hidden');

  tt.mode = 'showing';
  equal(tt.mode, 'showing', 'mode set to showing');

  tt.mode = 'baz';
  notEqual(tt.mode, 'baz', 'the mode is still the old value, showing');
  equal(tt.mode, 'showing', 'still on the previous mode, showing');
});

test('cues and activeCues return a TextTrackCueList', function() {
  let tt = new TextTrack({
    tech: defaultTech
  });

  ok(tt.cues.getCueById, 'cues are a TextTrackCueList');
  ok(tt.activeCues.getCueById, 'activeCues are a TextTrackCueList');
});

test('cues can be added and removed from a TextTrack', function() {
  let tt = new TextTrack({
    tech: defaultTech
  });
  let cues;

  cues = tt.cues;

  equal(cues.length, 0, 'start with zero cues');

  tt.addCue({id: '1'});

  equal(cues.length, 1, 'we have one cue');

  tt.removeCue(cues.getCueById('1'));

  equal(cues.length, 0, 'we have removed our one cue');

  tt.addCue({id: '1'});
  tt.addCue({id: '2'});
  tt.addCue({id: '3'});

  equal(cues.length, 3, 'we now have 3 cues');
});

test('fires cuechange when cues become active and inactive', function() {
  let player = TestHelpers.makePlayer();
  let changes = 0;
  let cuechangeHandler;
  let tt = new TextTrack({
    tech: player.tech_,
    mode: 'showing'
  });

  cuechangeHandler = function() {
    changes++;
  };

  tt.addCue({
    id: '1',
    startTime: 1,
    endTime: 5
  });

  tt.oncuechange = cuechangeHandler;
  tt.addEventListener('cuechange', cuechangeHandler);

  player.tech_.currentTime = function() {
    return 2;
  };

  player.tech_.trigger('timeupdate');

  equal(changes, 2, 'a cuechange event trigger addEventListener and oncuechange');

  player.tech_.currentTime = function() {
    return 7;
  };

  player.tech_.trigger('timeupdate');

  equal(changes, 4, 'a cuechange event trigger addEventListener and oncuechange');

  player.dispose();
});
