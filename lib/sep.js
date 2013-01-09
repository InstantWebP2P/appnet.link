// iWebPP Session Establish Protocol Definition
//
// the process between name-server and name-client is below:
// 1. started name-server, relay-server
// 2. waiting for name-client connect to name-server
// 3. calculating and analyzing name-server to name-client tracerouter
// 4. name-server responds to name-client's P2P or C/S connection requirement
// 5. name-client start keep-alive timer to maintain self's public ip/port - TBD...

// SEP offer/answer opcode:
//   0/1: client<->server for SDP session setup offer/answer
//   2/3: client<->server for NAT type report offer/answer
//   4/5: client<->server for STUN session setup offer/answer
//   6/7: server<->client for UDP hole punch setup offer/answer
//   8/9: client<->server for TURN session setup offer/answer
// 10/11: client<->server for KGEN session setup offer/answer
var SEP_OPC_SDP_OFFER    = exports.SEP_OPC_SDP_OFFER    = 0;
var SEP_OPC_SDP_ANSWER   = exports.SEP_OPC_SDP_ANSWER   = 1;
var SEP_OPC_NAT_OFFER    = exports.SEP_OPC_NAT_OFFER    = 2;
var SEP_OPC_NAT_ANSWER   = exports.SEP_OPC_NAT_ANSWER   = 3;
var SEP_OPC_STUN_OFFER   = exports.SEP_OPC_STUN_OFFER   = 4;
var SEP_OPC_STUN_ANSWER  = exports.SEP_OPC_STUN_ANSWER  = 5;
var SEP_OPC_PUNCH_OFFER  = exports.SEP_OPC_PUNCH_OFFER  = 6;
var SEP_OPC_PUNCH_ANSWER = exports.SEP_OPC_PUNCH_ANSWER = 7;
var SEP_OPC_TURN_OFFER   = exports.SEP_OPC_TURN_OFFER   = 8;
var SEP_OPC_TURN_ANSWER  = exports.SEP_OPC_TURN_ANSWER  = 9;
var SEP_OPC_KGEN_OFFER   = exports.SEP_OPC_KGEN_OFFER   = 10;
var SEP_OPC_KGEN_ANSWER  = exports.SEP_OPC_KGEN_ANSWER  = 11;

// SEP user's device and login info opcode:
var SEP_OPC_ALL_LOGIN_OFFER  = exports.SEP_OPC_ALL_LOGIN_OFFER  = 12;
var SEP_OPC_ALL_LOGIN_ANSWER = exports.SEP_OPC_ALL_LOGIN_ANSWER = 13;
var SEP_OPC_USR_LOGIN_OFFER  = exports.SEP_OPC_USR_LOGIN_OFFER  = 14;
var SEP_OPC_USR_LOGIN_ANSWER = exports.SEP_OPC_USR_LOGIN_ANSWER = 15;

var SEP_OPC_ALL_USR_OFFER    = exports.SEP_OPC_ALL_USR_OFFER    = 16;
var SEP_OPC_ALL_USR_ANSWER   = exports.SEP_OPC_ALL_USR_ANASWER  = 17;

var SEP_OPC_ALL_SDP_OFFER    = exports.SEP_OPC_ALL_SDP_OFFER    = 18;
var SEP_OPC_ALL_SDP_ANSWER   = exports.SEP_OPC_ALL_SDP_ANSWER   = 19;
var SEP_OPC_CLNT_SDP_OFFER   = exports.SEP_OPC_CLNT_SDP_OFFER   = 20;
var SEP_OPC_CLNT_SDP_ANSWER  = exports.SEP_OPC_CLNT_SDP_ANSWER  = 21;

// SEP answer state
var SEP_OPC_STATE_READY  = exports.SEP_OPC_STATE_READY = 0;
var SEP_OPC_STATE_FAIL   = exports.SEP_OPC_STATE_FAIL  = 1;

// STUN/TURN connection mode: c/s vs p2p
var SEP_MODE_CS = exports.SEP_MODE_CS = 0;
var SEP_MODE_PP = exports.SEP_MODE_PP = 1;

// Business server type in case c/s connection mode
// UDP    - raw UDP server, TBD...
// UDT    - reliable UDT net server
// HTTPP  - run HTTP server over UDT on UDP
// WSPP   - run websocket server over HTTPP on UDP
// secure servers
// UDTS   - reliable and secure UDT net server
// HTTPPS - run HTTP server over secure UDT on UDP
// WSPPS  - run secure websocket server over HTTPP on UDP
var SEP_TYPE_SRV_UDP    = exports.SEP_TYPE_SRV_UDP    = 0;
var SEP_TYPE_SRV_UDT    = exports.SEP_TYPE_SRV_UDT    = 1;
var SEP_TYPE_SRV_HTTPP  = exports.SEP_TYPE_SRV_HTTPP  = 2;
var SEP_TYPE_SRV_WSPP   = exports.SEP_TYPE_SRV_WSPP   = 3;
var SEP_TYPE_SRV_UDTS   = exports.SEP_TYPE_SRV_UDTS   = 4;
var SEP_TYPE_SRV_HTTPPS = exports.SEP_TYPE_SRV_HTTPPS = 5;
var SEP_TYPE_SRV_WSPPS  = exports.SEP_TYPE_SRV_WSPPS  = 6;

