
var SEP = require('../lib/sep');
var nmCln = require('../lib/iwebpp.io');

// iwebpp-ws library
var WebSocket = require('wspp');
var WebSocketServer = WebSocket.Server;

// msgpack library
var msgpack = require('msgpack-js');


// client B
var nmclnsB = new nmCln({
    srvinfo: {timeout: 20, endpoints: [{ip: 'www.iwebpp.com', port: 51686}, {ip: 'www.iwebpp.com', port: 51868}]},
    usrinfo: {domain: '51dese.com', usrkey: 'B'},
    conmode: {mode: SEP.SEP_MODE_CS, srvtype: SEP.SEP_TYPE_SRV_HTTPP, srvapp: function(req, res){
        console.log('test hole punch server logics...');
        res.send('test hole punch server logics...');
    }} // c/s mode as httpp server
});

nmclnsB.on('ready', function(){
    console.log('name-nmclnsB');
 
    // ask for all user info
    nmclnsB.getAllUsrs(function(err, usrs){
        if (!err) {
            ///console.log('got all User info answer:'+usrs.length+','+JSON.stringify(usrs));
        } else {
            console.log(err);    
        }
    });

    // ask for all Logins info
    /*nmclnsB.getBllLogins(function(err, logins){
        if (!err) {
            console.log('got Logins answer:'+JSON.stringify(logins));
        } else {
            console.log(err);    
        }
    });
    */

    // ask for user-specific Logins info
    nmclnsB.getUsrLogins({domain: '51dese.com', usrkey: 'A'}, function(err, logins){
        if (!err) {
            ///console.log('nmclnsA Logins answer:'+logins.length+','+JSON.stringify(logins));
          
            // ask for client-specific Logins info
           nmclnsB.getClntSdps(logins[logins.length-1].to.gid, function(err, sdps){
                if (!err) {
                    ///console.log('nmclnsB SDPs answer:'+JSON.stringify(sdps));
                      						 
                    // try to setup STUN connection to peer
                    var peerinfo = {
					    gid: sdps[sdps.length-1].from.gid, 
					    lip: sdps[sdps.length-1].from.localIP,
					  lport: sdps[sdps.length-1].from.localPort,
						     
					 natype: sdps[sdps.length-1].to.natype, 
							
					     ip: sdps[sdps.length-1].rel.clntIP, 
					   port: sdps[sdps.length-1].rel.clntPort
				    };
				    
                    nmclnsB.offerStun({endpoint: peerinfo}, function(err, stun){
                        console.log('B setup stun to peer:'+JSON.stringify(peerinfo));
                        
                        if (err || !stun) return console.log(err+',setup STUN to peer failed');
                        
						// try to connect to peer													
                        nmclnsB.createConnection({endpoint: peerinfo}, function(err, socket){
                            console.log('B connected to peer:'+JSON.stringify(peerinfo));
                            
                            if (err || !socket) return console.log(err+',connect to peer failed');
                            
                            socket.on('message', function(message, flags) {
					            // flags.binary will be set if a binary message is received
                                // flags.masked will be set if the message was masked
                                var data = (flags.binary) ? msgpack.decode(message) : JSON.parse(message);
                                console.log(JSON.stringify(data));
							});
							
							setInterval(function(){
							    socket.send(msgpack.encode('Hello, This Tom Zhou. :)'), {binary: true, mask: true});
							}, 2000);
                        });
                    });
                } else {
                    console.log(err);    
                }
            });
        } else {
            console.log(err);    
        }
    });
});

