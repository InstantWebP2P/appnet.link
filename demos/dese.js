
var WEBPP = require('../lib/iwebpp.io'),
    SEP = WEBPP.SEP;

/////////////////////////////////////////////////////////////////
// file share App
var express = require('express'),
    app = express();

app.use(express.directory(__dirname + '/shareA'));
app.use(express.static(__dirname + '/shareA'));
app.use(function(req, res){
    res.end('invalid path');
});
/////////////////////////////////////////////////////////////////

// create name-client
var nmcln = new WEBPP({
    srvinfo: {
        timeout: 20,
        endpoints: [{ip: 'www.iwebpp.com', port: 51686}, {ip: 'www.iwebpp.com', port: 51868}],
        turn: [
            {ip: 'www.iwebpp.com', agent: 51866, proxy: 51688} // every turn-server include proxy and agent port
        ]
    },
    usrinfo: {domain: '51dese.com', usrkey: 'demo'},
    conmode: {mode: SEP.SEP_MODE_CS, srvtype: SEP.SEP_TYPE_SRV_HTTPP, srvapp: app} // c/s mode as httpp server
});

nmcln.on('ready', function(){
    console.log('name-client ready on vpath:'+nmcln.vpath);
    console.log('please access URL: http://www.iwebpp.com:51688'+nmcln.vpath);
});
