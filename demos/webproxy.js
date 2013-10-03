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
    
    // start web proxy service
    var http = require('http');
    var webpxySrv = http.createServer();
    
    webpxySrv.on('request', self.webProxy().httpxy); 
    webpxySrv.on('upgrade', self.webProxy().wspxy);
    
    webpxySrv.listen(51688);
    
    console.log('web proxy server listen on port 51688');
});
