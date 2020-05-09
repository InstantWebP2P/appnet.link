'use strict';

/* AppNet.link: a node.js peer/p2p web framework 
 * Copyright(c) 2012-present Tom Zhou <appnet.link@gmail.com>
 * MIT Licensed
 */

var IO = module.exports = require('./lib/appnet.link');

IO.SEP     = IO.SEP     || require('./lib/sep');
IO.vURL    = IO.vURL    || require('./lib/vurl');
IO.Version = IO.Version || 1;

// V2 wrap
IO.V2 = IO.v2 = require('./lib/appnet.link-v2');

IO.V2.SEP     = IO.V2.SEP     || require('./lib/sep');
IO.V2.vURL    = IO.V2.vURL    || require('./lib/vurl');
IO.V2.Version = IO.V2.Version || 2;

/**
 * Create a new AppNet.link connection.
 *
 * @param {Object} options appnet.link options.
 * @param {Function} fn Open listener.
 * @returns {appnet.link client}
 * @api public
 */
IO.connect = IO.createConnection = function connect(options, fn) {
  var client = (options && options.version === 2) ? new IO.V2(options, fn) : new IO(options, fn);

  return client;
};
