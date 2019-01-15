# lan-connect

### Installation

	npm install https://github.com/nedjs/lan-connect.git -g

Check it works

	# lconnect -h
    Usage: lconnect [options]

    Options:
      -V, --version          output the version number
      -l, --listen           Listen for incoming connections (be a host).
      -p, --port [port]      Port for TCP connection [5528] (default: 5528)
      -u, --udp-port [port]  UDP broadcast port to use [5524] (default: 5525)
      -d, --debug            Print debugging information
      -v, --verbose          Verbose output, will print lots of information, this includes verbose output
      -h, --help             output usage information



### Usage

The applications intended usage is to quickly and easily connect 2 computers over LAN without having to lookup ip addresses. This uses UDP broadcasts sent from the server relay an ip address and port which a client should connect to. Each server will only accept 1 client and will stop broadcasting once someone connects. Both the client and server will terminate gracefully upon either end termination.


Example usage could be as follows:



Computer 1 (or same computer, localhost works)

	lconnect -l < myfile.zip 

Computer 2 
	
	lconnect > myfile.zip


This will make a copy of `myfile.zip` from computer 1 to computer 2, this of course requires that both computers are on the same LAN network, that network supports UDP broadcast and your on the same subnet. Thats alot of conditionals, however most computers can achive this using either a direct connect ethernet or home networks.