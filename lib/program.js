const pjson = require('../package.json');

module.exports = require('commander')
  .version(pjson.version)
  .option('-l, --listen', 'Listen for incoming connections (be a host).')
  .option('-p, --port [port]', 'Port for TCP connection [5528]', 5528)
  .option('-u, --udp-port [port]', 'UDP broadcast port to use [5524]', 5525)
  .option('-v, --verbose', 'Verbose output, will print debugging information')
  .option('-vv, --very-verbose', 'Extreme verbose output, will print lots of information, this includes verbose output')
  .parse(process.argv);