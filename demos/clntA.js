// Copyright (c) 2012 Tom Zhou<zs68j2ee@gmail.com>

var SEP = require('../lib/sep');
var nmCln = require('../lib/iwebpp.io');

// iwebpp-ws library
var WebSocket = require('wspp');
var WebSocketServer = WebSocket.Server;

// msgpack library
var msgpack = require('msgpack-js');

// create websocket server with name-client
var creatNmclnWss = function(self) {
	var wss = new WebSocketServer({httpp: true, server: self.bsrv.srv, path: self.vpath+SEP.SEP_CTRLPATH_BS});
	
	wss.on('connection', function(client){	
	    console.log('new ws connection: ' +
	                client._socket.remoteAddress+':'+client._socket.remotePort+' -> ' + 
	                client._socket.address().address+':'+client._socket.address().port);
								
	    client.on('message', function(message, flags) {
	        // flags.binary will be set if a binary message is received
	        // flags.masked will be set if the message was masked
	        var data = (flags.binary) ? msgpack.decode(message) : JSON.parse(message);
	        ///console.log('business message:'+JSON.stringify(data));
	        data += 'reply';
	
	        try {
	            client.send(msgpack.encode(data), {binary: true, mask: true}, function(err){
	                if (err) {
	                    console.log(err+',sendOpcMsg failed');
	                }
	            });
	        } catch (e) {
	            console.log(e+',sendOpcMsg failed immediately');
	        }
	    });
	});
}

// clients A
var nmclnsA = new nmCln({
    srvinfo: {
        timeout: 20,
        endpoints: [{ip: 'iwebpp.com', port: 51686}, {ip: 'iwebpp.com', port: 51868}],
        turn: [
            {ip: 'iwebpp.com', agent: 51866, proxy: 51688} // every turn-server include proxy and agent port
        ]
    },
    usrinfo: {domain: '51dese.com', usrkey: 'A'},
    conmode: SEP.SEP_MODE_CS
});

nmclnsA.on('ready', function(){
    console.log('name-nmclnsA ready');
    
   	// create websocket server
    creatNmclnWss(this);
});
