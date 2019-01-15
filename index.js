const dgram = require('dgram');
const buffer = require('buffer');
const Netmask = require('netmask').Netmask
const os = require('os');
const net = require('net');
const program = require('./lib/program');
const log = require('./lib/log.js');


(async function() {
	if(program.listen) {
		let stopBroadcast = false;
		let broadcastFn = () => stopBroadcast;
		// start listening for tcp connections
		let server = await listenServer(program.port, (client) => {
			log.tty('Client connected ' + client.address().address);

			createClientLifecycleHandler(client, () => {
				client.destroy();
				server.close();
				process.exit(0);
			});

			process.stdin.pipe(client);
			client.pipe(process.stdout);

			// once a client connects then dont broadcast on udp anymore
			stopBroadcast = true;
		});
		log.tty('Server started on port ' + server.address().port);
		// start broadcasting udp info about the server
		await broadcast(server.address().port, program.udpPort, broadcastFn);
	} else {
		log.tty('Listening for server connect packets');
		let address = await listenForBroadcast(program.udpPort);

		var client = new net.Socket();
		client.connect(address.port, address.address, function() {
			log.tty('Connected to ' + address.address + ' on port ' + address.port)
			process.stdin.pipe(client);
			client.pipe(process.stdout);
		});

		createClientLifecycleHandler(client, () => {
			client.destroy();
			process.exit(0);
		});
	}
})();


function createClientLifecycleHandler(client, onEnd) {
	let destroyFn = (type) => (...args) => {
		log.debug('Client connection terminated from client "' + type + '" event', ...(args || []));
		client.destroy();
		if(onEnd) {
			onEnd(...args);
		}
	}

	client.on('end', destroyFn('end'));
	client.on('close', destroyFn('close'));
	client.on('error', destroyFn('error'));
}


async function broadcast(serverPort, broadcastPort, stopBroadcastFn) {
	var ifaces = Object.values(os.networkInterfaces())
		.reduce((a, v) => a.concat(v), [])
		.filter(iface => iface.cidr && iface.family === 'IPv4')
		.map(iface => {
			let mask = new Netmask(iface.cidr);
			if(iface.internal || !mask.broadcast) {
				iface.broadcastAddr = iface.address;
			} else {
				iface.broadcastAddr = mask.broadcast;
			}

			return iface;
		});

	log.debug('Sending broadcast to: ', ifaces.map(i => i.broadcastAddr))
	while(!stopBroadcastFn()) {
		await Promise.all(Object.values(ifaces)
			.filter(iface => !iface.skip)
			.map(iface => {
				return new Promise((resolve, reject) => {
					let client = dgram.createSocket('udp4');

					let message = iface.address+":"+serverPort; 
					log.verbose('Broadcast to ' + iface.broadcastAddr + ':' + broadcastPort + ' with connect request to: ' + message);
					client.send(Buffer.from(message), broadcastPort, iface.broadcastAddr, function(error) {
						if(error) {
							log.debug('Failed to broadcast on ' + iface.broadcastAddr + ' skipping future packets', error);
							iface.skip = true;
						} else {
						}
						client.close();
						resolve(iface.broadcastAddr);
					});
				});
			}));
		await new Promise(r => setTimeout(() => r(), 1000));
	}
	log.verbose('Broadcasting ending');
}

async function listenServer(port, onConnect) {
	return new Promise((resolve, reject) => {
		var server = net.createServer(function(client) {
			onConnect(client);
		});

		server.listen(port, '0.0.0.0', () => {
			resolve(server);
		});
	});

}

async function listenForBroadcast(port) {
	return new Promise((resolve, reject) => {
		const server = dgram.createSocket('udp4');

		server.on('error', (err) => {
			reject(err);
			server.close();
		});

		server.on('message', (msg, rinfo) => {
			let msgParts = String(msg).split(':');
			if(String(msgParts[0]) === String(rinfo.address)) {
				server.close();
				resolve({
					address: msgParts[0],
					port: msgParts[1],
				});
			}
		});

		server.bind(port);
	});
}