const program = require('./program');

const tty = (...output) => {
	if(process.stdout.isTTY) {
		console.log(...output);
	}
}
const debug = (...output) => {
	if(program.debug || program.verbose) {
		tty('[debug]', ...output);
	}
}
const verbose = (...output) => {
	if(program.verbose) {
		tty('[verbose]', ...output);
	}
}

module.exports = {
	tty,
	debug,
	verbose,
}