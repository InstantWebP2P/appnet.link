iwebpp.io - iWebPP name-client to deliver Peer/P2P Web Service with Node.js.



### Features

* Run http over udp, leverage udp's high data-transfer performance
* Run web service in peer/p2p style, behind NAT/FW
* Support both TURN and STUN session with Websocket
* Expand client/central style web service transparently
* Easy to use API, reuse existing http/web technologes

### Install
  1. install iwebpp.io module by npm install iwebpp.io
  2. iwebpp.io will include node-httpp binary in bin directory, that supports 32/64bits linux/windows/osx.
  if the binary didn't work, you can build it from source- https://github.com/InstantWebP2P/node-httpp.git

### Usage/API:

    1. create iWebPP client

    var WEBPP = require('iwebpp.io');
    var nmcln = new WEBPP({
      usrinfo: {domain: '51dese.com', usrkey: 'dese'}, // fill usrkey. And, 51dese.com is only useful domain by now
    });
    nmcln.on('ready', function(){
      console.log('iwebpp.io ready with vURL:'+nmcln.vurl);
      // ...
    });

    2. hook your node.js web server in peer. Websocket server is supported with wspp module as well.notes: Please mount your web server in path prefix as nmcln.vpath below is express App example. file peerweb.js.

    var express = require('express');
    var WebSocket = require('wspp');
    var WebSocketServer = WebSocket.Server;
    var WEBPP = require('iwebpp.io');
    var nmcln = new WEBPP({
      usrinfo: {domain: '51dese.com', usrkey: 'dese'}, // fill your usrkey. And, 51dese.com is only useful domain by now
    });
    nmcln.on('ready', function(){
      // 2.1
      // create your express App
      var app = express();
      app.use(express.directory(__dirname + '/public'));
      app.use(express.static(__dirname + '/public'));
      app.use(function(req, res){
          res.end('invalid path');
      });
      // hook app on business server and mount on vPath
      var shell = express(); // create express shell app to mount on vPath
      shell.use(nmcln.vpath, app);
      nmcln.bsrv.srv.on('request', shell);
      console.log('Now access your web server via URL:'+nmcln.vurl);
      // 2.2
      // create your websocket server
      // notes: please always pass vPath as path option prefix of Websocket server
      var wss = new WebSocketServer({httpp: true, server: nmcln.bsrv.srv, path: nmcln.vpath//+your custom path});
      wss.on('connection', function(client){
        console.log('new ws connection');
      });
      console.log('Now connect to your websocket server via URL:'+nmcln.vurl);
    });

    3. launch your web server by bin/win32/node.exe peerweb.js in Windows32 machine.

    4. STUN/TURN session setup case, please refer to demos/clnt.js

### More demos:

    Look on demos/

### TODO:

* User authentication
* Domain authorization
* Enable STUN
* Improve documents, RFC draft

<br/>
### License

(The MIT License)

Copyright (c) 2012 Tom Zhou

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

