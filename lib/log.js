const program = require('./log');

module.exports = {
	tty: (...output) => {
		if(process.stdout.isTTY) {
			console.log(...output);
		}
	},
	debug: (...output) => {
		if(program.verbose) {
			log('[debug]', ...output);
		}
	},
	verbose: (...output) => {
		if(program.veryVerbose) {
			log('[verbose]', ...output);
		}
	}
}