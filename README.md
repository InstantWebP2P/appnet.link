iwebpp.io - www.peerweb.cn
=========

iWebPP name-client to deliver Peer Web Service with Node.js.


Install:
  
1. install iwebpp.io module by npm install iwebpp.io

2. iwebpp.io will include node-httpp binary in bin directory, that supports 32/64bits linux/windows/osx. 
   if the binary didn't work, you can build it from source - https://github.com/InstantWebP2P/node-httpp.git


Usage/API:

1. create iWebPP client
  var WEBPP = require('iwebpp.io');
  var nmcln = new WEBPP({
    usrinfo: {domain: '51dese.com', usrkey: 'dese'}, // fill usrkey. And, 51dese.com is only useful domain by now
  });

  nmcln.on('ready', function(){
    console.log('iwebpp.io ready with vURL:'+nmcln.vurl);
    
    // ...
  });
  
2. hook your node.js web server in peer. 
   notes: Please mount your web server in path prefix as nmcln.vpath

// below is express App example
// file peerweb.js
var express = require('express');
var WEBPP = require('iwebpp.io');
var nmcln = new WEBPP({
    usrinfo: {domain: '51dese.com', usrkey: 'dese'}, // fill your usrkey. And, 51dese.com is only useful domain by now
  });
  
  nmcln.on('ready', function(){
    
    // create your express App
    var app = express();

    app.use(nmcln.vpath, express.directory(__dirname + '/public'));
    app.use(nmcln.vpath, express.static(__dirname + '/public'));
    app.use(nmcln.vpath, function(req, res){
        res.end('invalid path');
    });
    
    // hook your express app
    nmcln.bsrv.srv.on('request', app);
    
    console.log('Now access your web server via URL:'+nmcln.vurl);
  });

3. launch your web server by bin/win32/node.exe peerweb.js in Windows32 machine.


More demos:

  Look at ./demos directory
  

TODO:

  1. user authentication
  2. domain authorization
  3. enable STUN 
