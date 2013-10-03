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
    var https = require('https');
    var http = require('http');
    var webpxySrv = https.createServer(self.secerts);
    var webpxySrv1 = http.createServer();
    
    webpxySrv.on('request', self.webProxy({https: true}).httpxy); 
    webpxySrv.on('upgrade', self.webProxy({https: true}).wspxy);
    
    webpxySrv.listen(51688);
    console.log('web secure proxy server listen on port 51688');
    
    webpxySrv1.on('request', self.webProxy({https: false}).httpxy); 
    webpxySrv1.on('upgrade', self.webProxy({https: false}).wspxy);
    
    webpxySrv1.listen(51866);
    console.log('web proxy server listen on port 51866');
});
