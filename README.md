## AppNet.link - Run HTTP and Web Service in Peer or P2P Style



### Features

* Run HTTP and HTTPS over UDP, taking UDP high data transfer performance
* Run web service in peer or p2p style, behind NAT/Firewall
* Support both TURN and STUN alike data channel with Websocket
* Support web proxy over STUN or TURN alike connection
* Support SDP session reconnect automatically
* Realtime web streaming from peer
* Support end-to-end security, ip-port-based ACL
* Multiplex connections on single udp port, saving system resources
* Extend client/central server style web service transparently
* Easy to use API, reuse existing http/web and node.js technology
* Peer Service management
* [Backend controller services](https://github.com/InstantWebP2P/appnet.link-controller) are open-source


### Install

  * appnet.link depends on nodejs-httpp, please build it from repo [nodejs-httpp](https://github.com/InstantWebP2P/nodejs-httpp.git)

  * install appnet.link module
  
        npm i appnet.link
  
  * setup your own AppNet.link backend controller services refer to [AppNet.link-controller](https://github.com/InstantWebP2P/appnet.link-controller)

#### Install on Linux with Docker


### Usage/API:

    1. create AppNet client

    var APPNET = require('appnet.link');
    var nmcln = new APPNET({
      usrinfo: {domain: '51dese.com', usrkey: 'dese'}, // fill usrkey. And, 51dese.com is only useful domain by now
    });
    nmcln.on('ready', function(){
      console.log('appnet.link ready with vURL:'+nmcln.vurl);
      // ...
    });

    2. hook node.js web server in peer. Websocket server is supported with wspp module as well. This is an express App example. file peerweb.js.

    var express = require('express');
    var WebSocket = require('wspp').wspp;
    var WebSocketServer = WebSocket.Server;
    var APPNET = require('appnet.link');
    var nmcln = new APPNET({
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
      // hook app on business server
      nmcln.bsrv.srv.on('request', app);
      console.log('Now access your web server via URL:'+nmcln.vurl);
      // 2.2
      // create your websocket server
      var wss = new WebSocketServer({httpp: true, server: nmcln.bsrv.srv});
      wss.on('connection', function(client){
        console.log('new ws connection');
      });
      console.log('Now connect to your websocket server via URL:'+nmcln.vurl);
    });

    3. STUN/TURN session setup case, please refer to demos/clnt.js
    
### [Web service over STUN](https://github.com/InstantWebP2P/appnet.link-stun-proxy)

### More demos:

    Look on demos/

### TODO:

* User authentication
* Domain authorization
* Improve documents, Protocol Spec, RFC draft


### Support us

* Welcome contributing on document, codes, tests and issues


### License

(The MIT License)

Copyright (c) 2012-present Tom Zhou(appnet.link@gmail.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

