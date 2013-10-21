// Copyright (c) 2013 Tom Zhou<zs68j2ee@gmail.com>

var SEP = require('../lib/sep');
var nmCln = require('../lib/iwebpp.io');

// vURL
var vURL = require('../lib/vurl');


// name-client
var nmcln = new nmCln({
    srvinfo: {
        timeout: 20,
        endpoints: [{ip: 'iwebpp.com', port: 51686}, {ip: 'iwebpp.com', port: 51868}],
        turn: [
            {ip: 'iwebpp.com', agent: 51866, proxy: 51688} // every turn-server include proxy and agent port
        ]
    },
    usrinfo: {domain: '51dese.com', usrkey: 'tomzhou'},
    conmode: SEP.SEP_MODE_CS,
      vmode: vURL.URL_MODE_HOST
});

nmcln.on('ready', function(){
    var self = this;
    
    // start socks proxy service
    var socks = require('node-socks');
    var sockspxySrv = socks.createServer(self.webProxy().socksApp);
    
    sockspxySrv.listen(51888);
    
    sockspxySrv.on('error', function (e) {
        console.error('SERVER ERROR: %j', e);
	    if (e.code == 'EADDRINUSE') {
	        console.log('Address in use, retrying in 10 seconds...');
	        setTimeout(function () {
	            console.log('Reconnecting to %s:%s', HOST, PORT);
	            sockspxySrv.close();
	            sockspxySrv.listen(51888);
	        }, 10000);
	    }
    });
    console.log('socks proxy server listen on port 51888');
});
