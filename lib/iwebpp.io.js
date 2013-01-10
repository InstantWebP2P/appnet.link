// iWebPP.IO name-client implementation

// eventEmitter
var eventEmitter = require('events').EventEmitter,
    util = require('util'),
    httpp = require('httpp'),
    httpps = require('httpps'),
    udt = require('udt'),
    os = require('os');
    
// msgpack library
var msgpack = require('msgpack-js');

// UUID generator
var uuid = require('node-uuid');

// p2p stream websocket library
var WebSocket = require('wspp');
var WebSocketServer = WebSocket.Server;

// Session establish protocol
var SEP = require('./sep');


// connect to TURN agent server
///nmCln.prototype.connectTurnAgent = function(fn, tmo){
var connectTurnAgent = function(self, fn, tmo){

    // 0.
    // callback event count
    self.clntturnagentCbCnt = self.clntturnagentCbCnt || 0;

    // 1.
    // make websocket connection to agent port
    if (self.turnSrvs && self.turnSrvs.length) {
        console.log('turn agent connection:'+'ws://'+self.turnSrvs[0].ip+':'+self.turnSrvs[0].agent);
        self.turnagentConn = new WebSocket('ws://'+self.turnSrvs[0].ip+':'+self.turnSrvs[0].agent, {hole: {port: self.port, addr: self.addr}});
        // initialize offer message count per client
        // every time, client send one offer message, increase it by one
        self.turnagentConn.offerMsgcnt = 0;
        
        var t = setTimeout(function(){
	        self.removeAllListeners('clntturnagent'+self.clntturnagentCbCnt);
            fn('connect TURN agent server timeout');
        }, (tmo || 30)*1000); // 30s timeout in default
    
        self.turnagentConn.on('open', function(){
            ///clearTimeout(t);
            ///fn(null, true);
            
            console.log('connected to turn agent server successfully');
            
            // 1.1
            // waiting for hole punch answer message
            self.once('clntturnagent'+self.clntturnagentCbCnt, function(yes){
                clearTimeout(t);
                fn(null, yes);
            });
            
            // 2.
            // send hole punch offer message anyway
            var tom = {};
            tom.opc = SEP.SEP_OPC_PUNCH_OFFER;
            
            tom.offer = {
                // protocol info
                proto: 'udp',
                 mode: SEP.SEP_MODE_CS,
                
                // client info
                clntlocalIP  : self.addr,
                clntlocalPort: self.port,
                devkey       : (self.devinfo && self.devinfo.devkey) || 'iloveyou',
                
                // server info
                    srvip: self.turnSrvs[0].ip,
                proxyport: self.turnSrvs[0].proxy,
                agentport: self.turnSrvs[0].agent                 
            };
            
            tom.seqno = self.turnagentConn.offerMsgcnt++;
            
            // !!! put callback event count            
            tom.evcbcnt = self.clntturnagentCbCnt++;
            
            try {
                self.turnagentConn.send(msgpack.encode(tom), {binary: true, mask: true}, function(err){
                    if (err) console.log(err+',send turn agent punch offer info failed');
                });
            } catch (e) {
                console.log(e+',send turn agent punch offer failed immediately');
            }
        });
        
        // 3.
        // handle agent server message
        self.turnagentConn.on('message', function(message, flags){
            var tdata = (flags.binary) ? msgpack.decode(message) : JSON.parse(message);
            console.log('nmclnt:new turn agent message:'+JSON.stringify(tdata));

            // check if opc is valid
            if ('number' === typeof tdata.opc) {
                switch (tdata.opc) {
                // offer/answer opc /////////////////////////////////////////////
                case SEP.SEP_OPC_PUNCH_ANSWER:
                    // 3.1
                    // check offer credit
                    
                    // 3.2
                    // check answer
                    if (tdata.answer && tdata.answer.ready) {
                        self.turnagentReady = true;
                    } else {
                        self.turnagentReady = false;
                    }
                    self.emit('clntturnagent'+tdata.evcbcnt, self.turnagentReady);
        
                    break;
                    
                default:
                    console.log('unknown opc');
                    break;
                }
            } else {
                 console.log('unknown message, nothing to do');    
            }
        });
    } else {
        console.log('no TURN server');
        fn('no TURN serve');
    }
};

// name-client pair: one primary client, another client bind on the same port and connect to alternate name-server.
// option argument consists of srvinfo,usrinfo,devinfo,srvmode:
// - srvinfo: {
//   endpoints: xxx,
//     timeout: xxx, // in sec
//        turn: [{ip: xxx, agent: xxx, proxy: xxx}] // TURN server endpoints with ip and proxy/agent ports
// - }
// - usrinfo: user MUST put user-specific info here to identify user globally,
//            for exmaple, user name+password->usrkey, domain name, etc
// - devinfo: device identity, etc, that used to generate devkey
// - conmode: {mode: xxx, srvtype: xxx, srvapp: xxx} connection mode with business server type in case c/s connection mode
var nmCln = exports = module.exports = function(options){
    var self = this;
    var i, conn, ctx;
    var rsdp;
    var srvinfo = options.srvinfo;
    var usrinfo = options.usrinfo;
    var devinfo = options.devinfo;
    var conmode = options.conmode;
    
    
    // super constructor
    eventEmitter.call(self);

    // state: new->connecting->ready/fail/timeout->closing->closed
    self.state = 'new';
    
    // userinfo/identity
    self.usrinfo = usrinfo;
    
    // deviceinfo/identity
	// TBD... got device identity by name UUID version 1 or 3 natively
    self.devinfo = devinfo || {devkey: uuid.v4()};
	
    // offer/answer cache
    self.offans_sdp  = []; // sdp session info
    self.offans_stun = []; // stun session info
    self.offans_turn = []; // turn session info
    self.offans_user = []; // login user info

    // at least connect to two name servers
    self.srvs    = srvinfo.endpoints ||
                   [{ip: 'localhost', port: 51686},
                    {ip: 'localhost', port: 51868}];
    self.ocnt    =           0; // opened connection count to servers
    self.conn    =          {}; // connections to name-server
    
    self.port    =           0; // all coonection MUST bind on the same port!!!
    self.addr    =        null; // all coonection MUST bind on the same local interface !!! by now always binding on first IPv4 interface
    self.oaddr   =        null; // the out address seen by peer. if NAT exists, it should be NAT/gw address, not local address
    self.natype  =           0; // 0: cone NAT/FW, 1: symmetry NAT/FW

    self.peer    =          {}; // connections to peers
    
    // at most one business server on self.addr/port for UDT or HTTPP or Websocket
    self.bsrv    =          {}; // business server bind on self.port in c/s connection mode

    // turn server obj cache
    // TBD balance... now only connect to one turn server
    if (srvinfo.turn) {
        self.turnSrvs      = Array.isArray(srvinfo.turn) ? srvinfo.turn : [srvinfo.turn];
        self.turnagentConn = {}; // connection to turn agent server
    } else {
        self.turnSrvs       = false;
        self.turnagentReady = false;
    }

    ///////////////////////////////////////////////////////////////////////////////////////
    // extract local address interface.
    var intfs = os.networkInterfaces();
    var addr4 = null, addr6 = null;
    var kkok4 = 0, kkok6 = 0;
    for (var k in intfs) {
        for (var kk in intfs[k]) {
            if (!kkok4 && ((intfs[k])[kk].internal === false) && ('IPv4' === (intfs[k])[kk].family)) {
               // find first foreign network interface
               addr4 = (intfs[k])[kk].address;
               
               kkok4 = 1;
               break;
            }
            
            if (!kkok6 && ((intfs[k])[kk].internal === false) && ('IPv6' === (intfs[k])[kk].family)) {
               // find first foreign network interface
               addr6 = (intfs[k])[kk].address;
               
               kkok6 = 1;
               break;
            }
        }
        
        // found it
        if (kkok4 && kkok6) break;
    }
    self.addr = addr4 ? addr4 : addr6; // prefer IPv4
    if (!self.addr) {
        console.log('no outgoing network interface');
        self.state = 'fail';
        self.emit('error', 'no outgoing network interface');
        return;
    }
    /////////////////////////////////////////////////////////////////////////////////////////////

    // on meessage process
    function onMessage(message, flags) {
        // flags.binary will be set if a binary message is received
        // flags.masked will be set if the message was masked
        var data = (flags.binary) ? msgpack.decode(message) : JSON.parse(message);
        ///console.log('nmcln:new message:'+JSON.stringify(data));

        // 1.
        // check if opc is valid
        if ('number' === typeof data.opc) {
            switch (data.opc) {
            case SEP.SEP_OPC_SDP_ANSWER:
                    
                if (data.answer.state === SEP.SEP_OPC_STATE_READY) {
                    self.offans_sdp.push(data);
                    
                    // in case connected to all name-servers
                    if (self.offans_sdp.length === self.srvs.length) {
                        // 2.
                        // check if symmetry nat/firewall by answer, then extract clint's public ip/port
                        // TBD... sdp decision in server side
                        var symmetry = 0;
                        for (var idx = 0; idx < (self.offans_sdp.lenght - 1); idx ++) {
                            if (!((self.offans_sdp[idx].answer.sdp.clntIP === self.offans_sdp[idx].answer.sdp.clntIP) &&
                                  (self.offans_sdp[idx+1].answer.sdp.clntPort === self.offans_sdp[idx+1].answer.sdp.clntPort))) {
                                symmetry = 1;
                                break;
                            }
                        }
                        
                        // 2.1
                        // record client NAT type
                        self.natype = symmetry;
                        
                        // 2.2
                        // return sdp info to user
                        rsdp = {
                            natype: symmetry, // 0: cone NAT/FW, 1: symmetry NAT/FW
                                
                            // local binding address/port
                            port: self.port,
                            addr: self.addr,
                                
                            // from sdp offer/answer exchange
                            publicIP: self.offans_sdp[0].answer.sdp.clntIP,
                            publicPort: (symmetry ? 0 : self.offans_sdp[0].answer.sdp.clntPort) // useless if it's symmetry NAT/FW
                        };
                        self.emit('clntsdpanswer'+data.evcbcnt, rsdp);
                            
                        ///console.log('got SDP successfully:'+JSON.stringify(rsdp));
                    }
                } else {
                    // return error info
                    self.emit('clntsdpanswer'+data.evcbcnt, {err: 'create sdp offer failed'});
                    console.log('create sdp offer failed:'+JSON.stringify(data));
                }
                break;
                
            case SEP.SEP_OPC_NAT_ANSWER:
                // 1.
                // check answer state
                if ((data.answer.state === SEP.SEP_OPC_STATE_READY) && data.answer.ready) {
                    // 2.
                    // send back stun info
                    self.emit('clntnatypeanswer'+data.evcbcnt);
                            
                    ///console.log('update client nat type info successfully:'+JSON.stringify(data));
                } else {
                    // return error info
                    self.emit('clntnatypeanswer'+data.evcbcnt, 'update client nat type info failed');
                    console.log('update client nat type info failed:'+JSON.stringify(data));
                }
                break;
                
            case SEP.SEP_OPC_PUNCH_OFFER:
                // 1.
                // check offer credits
                
                // 2.
                // punch hole
                self.punchHole({
                        endpoint: data.offer.peer,
                     isInitiator: data.offer.isInitiator
                 },
                 function(err, yes){
                    // fill answer
                    data.opc    = SEP.SEP_OPC_PUNCH_ANSWER;
                    data.answer = {};
                        
                    if (yes) {
                        data.answer.state = SEP.SEP_OPC_STATE_READY;
                        data.answer.ready = true;
                    } else {
                        data.answer.state = SEP.SEP_OPC_STATE_FAIL;
                        data.answer.ready = false;
                    }
                    // 3.
                    // send back punch answer to name-servers from initiator only
                    // TBD... balance among name-servers
                    if (data.offer.isInitiator) self.sendOpcMsg(data);
                });                
                break;

            case SEP.SEP_OPC_STUN_ANSWER:
                // 1.
                // check answer state
                if ((data.answer.state === SEP.SEP_OPC_STATE_READY) && data.answer.ready) {
                    // 2.
                    // send back stun info
                    self.emit('clntstunanswer'+data.evcbcnt, data.answer.stun);
                            
                    ///console.log('got stun info successfully:'+JSON.stringify(data));
                } else {
                    // return error info
                    self.emit('clntstunanswer'+data.evcbcnt, {err: 'ask client stun session failed'});
                    console.log('ask client stun session failed:'+JSON.stringify(data));
                }
                break;
                
            case SEP.SEP_OPC_TURN_ANSWER:
                break;
            
            // user management opc //////////////////////////////////////////////
            case SEP.SEP_OPC_CLNT_SDP_ANSWER:
                // 1.
                // check answer state
                if (data.answer.state === SEP.SEP_OPC_STATE_READY) {
                    // 2.
                    // send back sdp info
                    self.emit('clntsdps'+data.evcbcnt, data.answer.sdps);
                            
                    ///console.log('got sdp info successfully:'+JSON.stringify(data));
                } else {
                    // return error info
                    self.emit('clntsdps'+data.evcbcnt, {err: 'ask client sdp session failed'});
                    console.log('ask client sdp session failed:'+JSON.stringify(data));
                }
                break;
                
            case SEP.SEP_OPC_ALL_USR_ANSWER:
                // 1.
                // check answer state
                if (data.answer.state === SEP.SEP_OPC_STATE_READY) {
                    // 2.
                    // send back login info
                    self.emit('allusrs'+data.evcbcnt, data.answer.usrs);
                            
                    ///console.log('got user info successfully:'+JSON.stringify(data));
                } else {
                    // return error info
                    self.emit('allusrs'+data.evcbcnt, {err: 'ask user info failed'});
                    console.log('ask user info failed:'+JSON.stringify(data));
                }
                break;
                
            case SEP.SEP_OPC_ALL_LOGIN_ANSWER:
                // 1.
                // check answer state
                if (data.answer.state === SEP.SEP_OPC_STATE_READY) {
                    // 2.
                    // send back login info
                    self.emit('alllogins'+data.evcbcnt, data.answer.logins);
                            
                    ///console.log('got user logins successfully:'+JSON.stringify(data));
                } else {
                    // return error info
                    self.emit('alllogins'+data.evcbcnt, {err: 'ask user logins failed'});
                    console.log('ask user logins failed:'+JSON.stringify(data));
                }
                break;

            case SEP.SEP_OPC_USR_LOGIN_ANSWER:
                // 1.
                // check answer state
                if (data.answer.state === SEP.SEP_OPC_STATE_READY) {
                    // 2.
                    // send back login info
                    self.emit('usrlogins'+data.evcbcnt, data.answer.logins);
                            
                    ///console.log('got user logins successfully:'+JSON.stringify(data));
                } else {
                    // return error info
                    self.emit('usrlogins'+data.evcbcnt, {err: 'ask user logins failed'});
                    console.log('ask user logins failed:'+JSON.stringify(data));
                }
                break;
            // user management opc //////////////////////////////////////////////
            
            default:
                console.log('unknown opc');
                break;
            }
        } else {
            console.log('unknown message, nothing to do');    
        }
    }
    
    // 1.
    // start the first connection on random port,then waiting alternate connection
    // with 10s timeout.
    conn = new WebSocket('ws://'+self.srvs[0].ip+':'+self.srvs[0].port, {hole: {addr: self.addr}});
    // initialize offer message count per client
    // every time, client send one offer message, increase it by one
    conn.offerMsgcnt = 0;
    self.conn[JSON.stringify(self.srvs[0])] = {socket: conn, to: self.srvs[0]};
    
    var t = setTimeout(function(){
        self.state = 'timeout';
        self.emit('timeout', 'connection timeout');
        
        // close all connection
        for (var k in self.conn) {
            self.conn[k].socket.close();
        }
    }, (srvinfo.timeout || 20)*1000); // 20s timeout in default
    
    conn.on('open', function(){
        ///console.log('connection to the first name-server');
        
        // increase opened client count
        self.ocnt ++;
        
        // 2.
        // update state to connecting
        self.state = 'connecting';
        
        // 3.
        // record binding on port/ip/fd, then start alternate connections
        self.fd    = conn._socket.address().fd;
        self.port  = conn._socket.address().port;
        self.oaddr = conn._socket.address().address; // the address seen by peer
        console.log('nmclnt binding on %s:%d with fd:%d', self.addr, self.port, self.fd);
        
        for (i = 1; i < self.srvs.length; i ++) {
            conn = new WebSocket('ws://'+self.srvs[i].ip+':'+self.srvs[i].port, {hole: {port: self.port, addr: self.addr}});
            // initialize offer message count per client
            // every time, client send one offer message, increase it by one
            conn.offerMsgcnt = 0;
                
            self.conn[JSON.stringify(self.srvs[i])] = {socket: conn, to: self.srvs[i]};

            // 4.
            // all connection ready, then emit nmCln ready event
            conn.on('open', function(){
                // increase opened connection count
                self.ocnt++;
                if (self.ocnt == self.srvs.length) {
                    clearTimeout(t);
                                       
                    // 5.
                    // launch business server in case c/s connection mode
					if (conmode && (conmode.mode === SEP.SEP_MODE_CS)) {
					    switch (conmode.srvtype) {
						case SEP.SEP_TYPE_SRV_UDP:
						    break;
							
						case SEP.SEP_TYPE_SRV_UDT:
						    break;
						
						case SEP.SEP_TYPE_SRV_UDTS:
						    break;
							
						case SEP.SEP_TYPE_SRV_HTTPP:
						    // create httpp server with app
						    self.bsrv.type = SEP.SEP_TYPE_SRV_HTTPP;
						    
						    self.bsrv.srv = httpp.createServer(conmode.srvapp || function(req, res){
						        // default app logics
						        console.log('please hook application...');
						        res.send('please hook application...');
						    }).listen(self.port, self.addr);
						    
						    // hook websocket hole punch server
						    self.bsrv.hpsrv = new WebSocketServer({server: self.bsrv.srv});
						    self.bsrv.hpsrv.on('connection', function(client){	
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
						    break;
							
						case SEP.SEP_TYPE_SRV_HTTPPS:
						    break;

						case SEP.SEP_TYPE_SRV_WSPPS:
						    break;
							
						case SEP.SEP_TYPE_SRV_WSPP:
						default:
                            self.bsrv = {srv: new WebSocketServer({host: self.addr, port: self.port}), type: SEP.SEP_TYPE_SRV_WSPP};
                            
							self.bsrv.srv.on('connection', function(client){
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
							break;
					    }
                        console.log('business websocket server started ...');
						
                        // 6.
						// emit ready event after start business server
						self.state = 'ready';
						ctx = {
                            state: self.state,
                            srvs: self.srvs,
                            port: self.port,
                            addr: self.addr,
                            ocnt: self.ocnt
                        };
						
						// 6.1
						// ask for SDP info for the firt time
						// notes: user can ask SDP info later on as well
                        /*self.offerSdp(function(err, sdp){
                            if (!err && sdp) {
                                console.log('got SDP answer:'+JSON.stringify(sdp));
                                ctx.sdp = sdp;
                            } else {
                                console.log(err);    
                            }*/
                            
                            // 7.
                            // connect TURN agent server
                            if (self.turnSrvs) {
                                connectTurnAgent(self, function(err, yes){
                                    if (!err && yes) {
                                        self.turnagentReady = true;
                                    } else {
                                        self.turnagentReady = false;
                                    }
                                    ctx.turnagentReady = self.turnagentReady;
                                    self.emit('ready', ctx);                                    
                                });
                            } else {
                                self.emit('ready', ctx);
                            }
                        //});
					} else {
                        // 6.
						// emit ready event immediately
						self.state = 'ready';
						ctx = {
                            state: self.state,
                            srvs: self.srvs,
                            port: self.port,
                            addr: self.addr,
                            ocnt: self.ocnt
                        };
                        
                        // 6.1
						// ask for SDP info for the firt time
						// notes: user can ask SDP info later on as well
                        /*self.offerSdp(function(err, sdp){
                            if (!err && sdp) {
                                console.log('got SDP answer:'+JSON.stringify(sdp));
                                ctx.sdp = sdp;
                            } else {
                                console.log(err);    
                            }*/
                            
                            // 7.
                            // connect TURN agent server
                            if (self.turnSrvs) {
                                connectTurnAgent(self, function(err, yes){
                                    if (!err && yes) {
                                        self.turnagentReady = true;
                                    } else {
                                        self.turnagentReady = false;
                                    }
                                    ctx.turnagentReady = self.turnagentReady;
                                    self.emit('ready', ctx);                                    
                                });
                            } else {
                                self.emit('ready', ctx);
                            }
                        //});
					}
                }
            });
            
            // 5.
            // on message
            conn.on('message', onMessage);
        }
    });
    
    // on message
    conn.on('message', onMessage);

    // on close
    conn.on('close', function(){
        self.state = 'closed';
        self.emit('close',  {
            state: self.state,
             srvs: self.srvs,
             port: self.port,
             addr: self.addr
        });
    });
        
    // on error
    conn.on('error', function(err){
        // close connectoin
        // notes: let low layer handle it
        ///conn.close();
        
        self.state = 'fail';
        self.emit('error', err);
    });
};

util.inherits(nmCln, eventEmitter);

// instance methods

// create connection to peer with c/s and p2p connection mode,
// if both peer behind the same nat/fw, connect to internal ip/port directly;
// TBD...support in case muli-level internal NAT/FW.
// 
// notes: in p2p mode, set socket rendezvous option. 
// a timeout needed in secs
// to.endpoint: {ip:xxx, port:xxx}
// to.timeout: in seconds
nmCln.prototype.createConnection = function(to, fn){
    var self = this;
    var opt = {hole: {port: self.port, addr: self.addr}};
    var conn;
    
    
    if (to.mode == SEP.SEP_MODE_PP) {
        opt.hole.opt = {};
        opt.hole.opt.rendez = true;
    }

    if (self.offans_sdp[0].answer.sdp.clntIP == to.endpoint.ip) {
        conn = new WebSocket('ws://'+to.endpoint.lip+':'+to.endpoint.lport, opt);
        console.log('direct connection...');
    } else {
        conn = new WebSocket('ws://'+to.endpoint.ip+':'+to.endpoint.port, opt);
    }
    
    var t = setTimeout(function(){
        fn('connection timeout');
        conn.close();
    }, (to.timeout || 10)*1000); // 10s timeout in default
    
    conn.on('open', function(){
        clearTimeout(t);        
        fn(null, conn);
        
		// TBD... caching in memStore
        self.peer[JSON.stringify(to.endpoint)] = {socket: conn, to: to.endpoint};
    
        console.log('new peer connection in %s mode',
        (to.mode == SEP.SEP_MODE_PP) ? 'p2p' : 'c/s');
    });
};

// punch hole to destination endpoint,
// if both peer behind the same nat/fw, using internal ip/port.
// notes: a timeout needed in secs
nmCln.prototype.punchHole = function(to, fn){
    var self = this;
    var opt = {hole: {port: self.port, addr: self.addr}};
    var hole;
    var endinfo;
    
    
    // 1.
    // create dummy connection
    if (to.mode == SEP.SEP_MODE_PP) {
        opt.hole.opt = {};
        opt.hole.opt.rendez = true;
    }

    if (self.offans_sdp[0].answer.sdp.clntIP == to.endpoint.ip) {
        endinfo = {
                    port: to.endpoint.lport,
                    host: to.endpoint.lip,
            localAddress: opt.hole
        };
    } else {
        endinfo = {
                    port: to.endpoint.port,
                    host: to.endpoint.ip,
            localAddress: opt.hole
        }
    }
    hole = udt.createHole(endinfo);

    var intl = setInterval(function(){
        hole.punchhole(endinfo);
    }, 300); // punch hole every 300ms
    console.log('punch hole: '+self.addr+':'+self.port+' -> '+endinfo.host+':'+endinfo.port);

    // 2.
    // try to setup websocket connection after 1s
    setTimeout(function(){
        // clear interval timer, then close hole soon
        clearInterval(intl);
        
        // close hole
        setTimeout(function(){
            hole.destroy();
        }, 1000); // after 1s in default
    
    
        var conn;
        if (self.offans_sdp[0].answer.sdp.clntIP == to.endpoint.ip) {
            conn = new WebSocket('ws://'+to.endpoint.lip+':'+to.endpoint.lport, opt);
        } else {
            conn = new WebSocket('ws://'+to.endpoint.ip+':'+to.endpoint.port, opt);
        }
    
        var t = setTimeout(function(){
            fn('punch hole timeout', 0);
            conn.close();
            console.log('punch hole timeout in %s mode from %s',
            (to.mode == SEP.SEP_MODE_PP) ? 'p2p' : 'c/s',
		    (to.isInitiator)? 'initiator' : 'peer');
        }, (to.timeout || 30)*1000); // 30s timeout in default
    
        conn.on('open', function(){
            clearTimeout(t); 
            fn(null, 1);
            ///if (!(to.isInitiator)) conn.close(); // close connection launched by peer TBD...
        
            console.log('punch hole successfully in %s mode from %s',
            (to.mode == SEP.SEP_MODE_PP) ? 'p2p' : 'c/s',
		    (to.isInitiator)? 'initiator' : 'peer');
        });
    
        conn.on('message', function(data, flags) {
            console.log('punch hole messaging in %s mode from %s',
            (to.mode == SEP.SEP_MODE_PP) ? 'p2p' : 'c/s',
		    (to.isInitiator)? 'initiator' : 'peer');
        });
   
        conn.on('error', function(){
            clearTimeout(t); 
            fn('punch hole error', 0);
            conn.close();
        
            console.log('punch hole error in %s mode from %s',
            (to.mode == SEP.SEP_MODE_PP) ? 'p2p' : 'c/s',
		    (to.isInitiator)? 'initiator' : 'peer');
        });
   
        conn.on('close', function(){
            console.log('punch hole closed in %s mode from %s',
            (to.mode == SEP.SEP_MODE_PP) ? 'p2p' : 'c/s',
            (to.isInitiator)? 'initiator' : 'peer');
        });
   
        // 2.
        // send dummy packet
        // TBD... with udp packets
    
        // 3.
        // waiting connection timeout
    }, 1000); // 1s timeout
};

// ask for sdp info, then wait for sdp answer message
// notes: put timeout(in seconds) in second paramter
nmCln.prototype.offerSdp = function(fn, tmo){
    var self = this;
    
    // callback event count
    self.clntsdpanswerCbCnt = self.clntsdpanswerCbCnt || 0;
    
    // 0.
    // clear previous SDP session cache
    if (self.offans_sdp && self.offans_sdp.length) self.offans_sdp.clear();
    
    // 1.
    // added SDP event listener with timeout
    var t = setTimeout(function(){
	    self.removeAllListeners('clntsdpanswer'+self.clntsdpanswerCbCnt);
        fn('offerSdp timeout');
    }, (tmo || 60)*1000); // 60s timeout in default
    
    ///console.log('pre-event:'+'clntsdpanswer'+self.clntsdpanswerCbCnt);
    self.once('clntsdpanswer'+self.clntsdpanswerCbCnt, function(sdp){
        ///console.log('after-event:'+'clntsdpanswer'+self.clntsdpanswerCbCnt);
        
        clearTimeout(t);
        
        if (sdp.err) {
            fn(sdp.err+',offer sdp failed');
        } else {
            fn(null, sdp);
        }
    });

    // 2.
    // fill SDP offer message
    var opc_msg = {};
    opc_msg.opc = SEP.SEP_OPC_SDP_OFFER;
    
    // 2.0
    // !!! place callback count in message context
    opc_msg.evcbcnt = self.clntsdpanswerCbCnt++;
                    
    // 2.1
    // fill SDP session info got by client
    opc_msg.offer = {
        // protocol info
        proto         : 'udp',
        
        // client/device info
        clntlocalIP   : self.addr,
        clntlocalPort : self.port,
        devkey        : (self.devinfo && self.devinfo.devkey) || 'iloveyou',
        domain        : (self.usrinfo && self.usrinfo.domain) || '51dese.com',
        usrkey        : (self.usrinfo && self.usrinfo.usrkey) || 'tomzhou',
        
        // TURN agent session state
        turnagentReady: self.turnagentReady || false,
                        
        // timestamp on session start and done
        // TBD... round trip timestamp
        ///stamp_start  : Date.now()
        start         : Date.now()
    };
    
    // 3.
    // send opc in all connections
    for (var k in self.conn) {
        // fill connection-specific info
        opc_msg.offer.srvpublicIP   = self.conn[k].to.ip;
        opc_msg.offer.srvpublicPort = self.conn[k].to.port;
        
        // offer message count as sequence number
        opc_msg.seqno = self.conn[k].socket.offerMsgcnt++;
        
        try {
            self.conn[k].socket.send(msgpack.encode(opc_msg), {binary: true, mask: true}, function(err){
                if (err) console.log(err+',send sdp info failed');
            });
        } catch (e) {
            console.log(e+',send sdp info failed immediately');
        }
    }
};

// update client NAT type info
nmCln.prototype.updateNatype = function(fn, tmo){
    var self = this;
    
    // callback event count
    self.clntnatypeanswerCbCnt = self.clntnatypeanswerCbCnt || 0;

    // 1.
    // added clntnatype event listener with timeout
    var t = setTimeout(function(){
	    self.removeAllListeners('clntnatypeanswer'+self.clntnatypeanswerCbCnt);
        fn('updateNatype timeout');
    }, (tmo || 60)*1000); // 60s timeout in default
    
    self.once('clntnatypeanswer'+self.clntnatypeanswerCbCnt, function(err){
        clearTimeout(t);

        if (err) {
            fn(err+',update client natype info failed');
        } else {
            fn(null);
        }
    });
    
    // 2.
    // fill NAT type offer message
    var opc_msg = {};
    opc_msg.opc = SEP.SEP_OPC_NAT_OFFER;
    
    // 2.0
    // !!! place callback count in message context
    opc_msg.evcbcnt = self.clntnatypeanswerCbCnt++;
 
    // 2.1
    // fill  NAT type info with client
    opc_msg.offer = {
           gid: self.offans_sdp[0].answer.client.gid,
        natype: self.natype
    };
    
    // 3.
    // send opc 
    self.sendOpcMsg(opc_msg, function(err){
        if (err) return fn(err+',updateNatype failed'); 
    }); 
};

// ask for stun info, then wait for stun answer message
// notes: put timeout(in seconds) in second paramter
// peer: destination client info
nmCln.prototype.offerStun = function(peer, fn, tmo){
    var self = this;
    
    
    // callback event count
    self.clntstunanswerCbCnt = self.clntstunanswerCbCnt || 0;

    // 1.
    // added clntstunanswer event listener with timeout
    var t = setTimeout(function(){
	    self.removeAllListeners('clntstunanswer'+self.clntstunanswerCbCnt);
        fn('offerStun timeout');
    }, (tmo || 20)*1000); // 20s timeout in default
    
    self.once('clntstunanswer'+self.clntstunanswerCbCnt, function(stun){
        clearTimeout(t);

        if (stun.err) {
            fn(stun.err+',offerStun failed');
        } else {
            fn(null, stun);
        }
    });
    
    // 2.
    // fill STUN offer message
    var opc_msg = {};
    opc_msg.opc = SEP.SEP_OPC_STUN_OFFER;
    
    // 2.0
    // !!! place callback count in message context
    opc_msg.evcbcnt = self.clntstunanswerCbCnt++;
 
    // 2.1
    // fill STUN info with client ip/port
    var mine = {
        natype: self.natype,
           gid: self.offans_sdp[0].answer.client.gid,
               
          port: self.offans_sdp[0].answer.sdp.clntPort,
            ip: self.offans_sdp[0].answer.sdp.clntIP,
            
         lport: self.offans_sdp[0].answer.client.localPort,
           lip: self.offans_sdp[0].answer.client.localIP
    };
    var peer = {
        natype: peer.endpoint.natype,
           gid: peer.endpoint.gid,
          
          port: peer.endpoint.port,
            ip: peer.endpoint.ip,
            
         lport: peer.endpoint.lport,
           lip: peer.endpoint.lip
    };
    opc_msg.offer = {mine: mine, peer: peer};
    
    // 3.
    // send opc 
    self.sendOpcMsg(opc_msg, function(err){
        if (err) return fn(err+',offerStun failed'); 
    });
};

// send opc msg to the first name-server
nmCln.prototype.sendOpcMsg = function(opc_msg, fn){
    var self = this;
    var con0 = JSON.stringify(self.srvs[0]); // connection to the first name-server
    
    // fill offer message count as sequence number
    opc_msg.seqno = self.conn[con0].socket.offerMsgcnt++;

    try {
        self.conn[con0].socket.send(msgpack.encode(opc_msg), {binary: true, mask: true}, function(err){
            if (err) {
                console.log(err+',sendOpcMsg failed');
                if (fn) fn(err+',sendOpcMsg failed');
            } else {
                if (fn) fn(null);
            }
        });
    } catch (e) {
        console.log(e+',sendOpcMsg failed immediately');
        if (fn) fn(e+',sendOpcMsg failed immediately');
    }
};

// get sdp info
nmCln.prototype.getClntSdps = function(clntinfo, fn, tmo){
    var self = this;
    
    // callback event count
    self.clntsdpsCbCnt = self.clntsdpsCbCnt || 0;

    // 1.
    // added clntsdps event listener with timeout
    var t = setTimeout(function(){
	    self.removeAllListeners('clntsdps'+self.clntsdpsCbCnt);
        fn('getClntSdps timeout');
    }, (tmo || 60)*1000); // 60s timeout in default
    
    self.once('clntsdps'+self.clntsdpsCbCnt, function(sdps){
        clearTimeout(t);

        if (sdps.err) {
            fn(sdps.err+',get client sdp info failed');
        } else {
            fn(null, sdps);
        }
    });
    
    // 2.
    // fill CLNT-SDPS offer message
    var opc_msg = {};
    opc_msg.opc = SEP.SEP_OPC_CLNT_SDP_OFFER;
    
    // 2.0
    // !!! place callback count in message context
    opc_msg.evcbcnt = self.clntsdpsCbCnt++;
 
    // 2.1
    // fill CLNT-SDPS sdp info with client
    opc_msg.offer = {
        mine: self.usrinfo,
        clnt: clntinfo
    };
    
    // 3.
    // send opc 
    self.sendOpcMsg(opc_msg, function(err){
        if (err) return fn(err+',getClntSdps failed'); 
    }); 
};

// get peer's login info
nmCln.prototype.getUsrLogins = function(usrinfo, fn, tmo){
    var self = this;
    
    // callback event count
    self.usrloginsCbCnt = self.usrloginsCbCnt || 0;

    // 1.
    // added alllogin event listener with timeout
    var t = setTimeout(function(){
	    self.removeAllListeners('usrlogins'+self.usrloginsCbCnt);
        fn('getUsrLogins timeout');
    }, (tmo || 60)*1000); // 60s timeout in default
    
    self.once('usrlogins'+self.usrloginsCbCnt, function(logins){
        clearTimeout(t);

        if (logins.err) {
            fn(logins.err+',get peer login info failed');
        } else {
            fn(null, logins);
        }
    });
    
    // 2.
    // fill USR-LOGINS offer message
    var opc_msg = {};
    opc_msg.opc = SEP.SEP_OPC_USR_LOGIN_OFFER;
    
    // 2.0
    // !!! place callback count in message context
    opc_msg.evcbcnt = self.usrloginsCbCnt++;

    // 2.1
    // fill USR-LOGINS user info with client
    opc_msg.offer = {
        mine: self.usrinfo,
        peer: usrinfo
    };
    
    // 3.
    // send opc 
    self.sendOpcMsg(opc_msg, function(err){
        if (err) return fn(err+',getUsrLogins failed'); 
    }); 
};

nmCln.prototype.getAllLogins = function(fn, tmo){
    var self = this;
    
    // callback event count
    self.allloginsCbCnt = self.allloginsCbCnt || 0;

    // 1.
    // added alllogin event listener with timeout
    var t = setTimeout(function(){
	    self.removeAllListeners('alllogins'+self.allloginsCbCnt);
        fn('getAllLogins timeout');
    }, (tmo || 60)*1000); // 60s timeout in default
    
    self.once('alllogins'+self.allloginsCbCnt, function(logins){
        clearTimeout(t);

        if (logins.err) {
            fn(logins.err+',get all logins failed');
        } else {
            fn(null, logins);
        }
    });

    // 2.
    // fill ALL-LOGINS offer message
    var opc_msg = {};
    opc_msg.opc = SEP.SEP_OPC_ALL_LOGIN_OFFER;
    
    // 2.0
    // !!! place callback count in message context
    opc_msg.evcbcnt = self.allloginsCbCnt++;

    // 2.1
    // fill ALL-LOGINS user info with client
    opc_msg.offer = {
        mine: self.usrinfo
    };
    
    // 3.
    // send opc 
    self.sendOpcMsg(opc_msg, function(err){
        if (err) return fn(err+',getAllLogins failed'); 
    });    
};

// get user info
// TBD... ACL logic
nmCln.prototype.getAllUsrs = function(fn, tmo){
    var self = this;
    
    // callback event count
    self.allusrsCbCnt = self.allusrsCbCnt || 0;

    // 1.
    // added allusrs event listener with timeout
    var t = setTimeout(function(){
	    self.removeAllListeners('allusrs'+self.allusrsCbCnt);
        fn('getAllUsrs timeout');
    }, (tmo || 60)*1000); // 60s timeout in default
    
    self.once('allusrs'+self.allusrsCbCnt, function(usrs){
        clearTimeout(t);

        if (usrs.err) {
            fn(usrs.err+',get all users failed');
        } else {
            fn(null, usrs);
        }
    });

    // 2.
    // fill ALL-USR offer message
    var opc_msg = {};
    opc_msg.opc = SEP.SEP_OPC_ALL_USR_OFFER;
    
    // 2.0
    // !!! place callback count in message context
    opc_msg.evcbcnt = self.allusrsCbCnt++;

    // 2.1
    // fill ALL-USR user info with client
    opc_msg.offer = {
        mine: self.usrinfo
    };
    
    // 3.
    // send opc 
    self.sendOpcMsg(opc_msg, function(err){
        if (err) return fn(err+',getAllUsrs failed'); 
    });    
};

// class methods

// exprots SEP 
exports.SEP = SEP;

