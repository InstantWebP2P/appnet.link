
var WEBPP = require('../lib/iwebpp.io'),
    SEP = WEBPP.SEP;

var express = require('express');

// create name-client
var nmcln = new WEBPP({
    srvinfo: {
        timeout: 20,
        endpoints: [{ip: 'www.iwebpp.com', port: 51686}, {ip: 'www.iwebpp.com', port: 51868}],
        turn: [
            {ip: 'www.iwebpp.com', agent: 51866, proxy: 51688} // every turn-server include proxy and agent port
        ]
    },
    usrinfo: {domain: '51dese.com', usrkey: 'dese'},
    conmode: SEP.SEP_MODE_CS // c/s mode as httpp server
});

nmcln.on('ready', function(){
    console.log('name-client ready on vpath:'+nmcln.vpath);

/////////////////////////////////////////////////////////////////
// file share App
    var app = express();

    app.use(nmcln.vpath, express.directory(__dirname + '/shareA'));
    app.use(nmcln.vpath, express.static(__dirname + '/shareA'));
    app.use(nmcln.vpath, function(req, res){
        res.end('invalid path');
    });
/////////////////////////////////////////////////////////////////
    
    // hook app on business server
    nmcln.bsrv.srv.on('request', app);
        
    console.log('please access URL: http://localhost:51688'+nmcln.vpath);
});
