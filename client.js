const dgram = require('dgram');
const buffer = require('buffer');
const Netmask = require('netmask').Netmask
const os = require('os');
const net = require('net');


const SERVER_PORT = 5528;
const BROADCAST_PORT = 5525;

async function broadcast(serverPort, stopBroadcastFn) {
	var ifaces = Object.values(os.networkInterfaces())
			.reduce((a, v) => a.concat(v), [])
			.filter(iface => !iface.internal && iface.family === 'IPv4' && iface.cidr)
			.concat([{ cidr: '127.0.0.1', address: '127.0.0.1' }])

	while(!stopBroadcastFn()) {
		await Promise.all(Object.values(ifaces)
			.map(iface => {
				return new Promise((resolve, reject) => {
					let mask = new Netmask(iface.cidr);
					var client = dgram.createSocket('udp4');
					client.send(Buffer.from(iface.address+":"+serverPort), BROADCAST_PORT, mask.broadcast, function(error) {
						if(error) {
							reject(error);
						} else {
							resolve(mask.broadcast);
						}
						client.close();
					});
				});
			}));
		await new Promise(r => setTimeout(() => r(), 1000));
	}
}

async function listenServer(onConnect) {
	return new Promise((resolve, reject) => {
		var server = net.createServer(function(client) {
			console.log('Client connected ' + client.address().address);

			let destroyFn = () => {
				client.destroy();
				server.close();
				process.exit(0);
			}

			client.on('end', destroyFn);
			client.on('close', destroyFn);
			client.on('error', destroyFn);

			process.stdin.pipe(client);
			client.pipe(process.stdout);
			onConnect(client);
		});

		server.listen(SERVER_PORT, '0.0.0.0', () => {
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


(async function() {
	var args = process.argv.slice(2);
	if(args.indexOf('-l') !== -1) {
		let stopBroadcast = false;

		let server = await listenServer(() => {
			// once a client connects then dont broadcast on udp anymore
			stopBroadcast = true;
		});
		console.log('Server started on port ' + server.address().port);
		let broadcastPromise = broadcast(server.address().port, () => stopBroadcast);
	} else {
		console.log('Listening for server connect packets');
		let address = await listenForBroadcast(BROADCAST_PORT);

		var client = new net.Socket();
		client.connect(address.port, address.address, function() {
			console.log('Connected to ' + address.address + ' on port ' + address.port)
			process.stdin.pipe(client);
			client.pipe(process.stdout);
		});

		let destroyFn = () => {
			client.destroy();
			process.exit(0);
		}

		client.on('end', destroyFn);
		client.on('close', destroyFn);
		client.on('error', destroyFn);
	}
})();
