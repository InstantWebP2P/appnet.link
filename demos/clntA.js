
var SEP = require('../lib/sep');
var nmCln = require('../lib/iwebpp.io');

// iwebpp-ws library
var WebSocket = require('wspp');
var WebSocketServer = WebSocket.Server;

// msgpack library
var msgpack = require('msgpack-js');


// clients A
var nmclnsA = new nmCln({
    srvinfo: {timeout: 20, endpoints: [{ip: 'www.iwebpp.com', port: 51686}, {ip: 'www.iwebpp.com', port: 51868}]},
    usrinfo: {domain: '51dese.com', usrkey: 'A'},
    /*conmode: {mode: SEP.SEP_MODE_CS, srvtype: SEP.SEP_TYPE_SRV_HTTPP, srvapp: function(req, res){
        console.log('test hole punch server logics...');
        res.send('test hole punch server logics...');
    }}*/ // c/s mode as httpp server
    conmode: {mode: SEP.SEP_MODE_CS, srvtype: SEP.SEP_TYPE_SRV_WSPP}
});

nmclnsA.on('ready', function(){
    console.log('name-nmclnsA ready');
});

