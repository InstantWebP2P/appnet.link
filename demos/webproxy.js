// Copyright (c) 2013 Tom Zhou<iwebpp@gmail.com>

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
    var srv = https.createServer(self.secerts);
    
    var proxy = self.webProxy({https: true});
    srv.on('request', proxy.httpApp); 
    srv.on('upgrade', proxy.wsApp);
    
    srv.listen(51688);
    console.log('Web proxy server listen on port 51688');
});
