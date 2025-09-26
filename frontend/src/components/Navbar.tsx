import { Link } from "react-router-dom";
import { useConnect, useAccount, useDisconnect } from "wagmi";

const CustomConnectButton = () => {
  const { connect, connectors } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const injectedConnector = connectors.find(
    (connector) => connector.id === "io.metamask"
  );

  if (isConnected) {
    return (
      <div>
        <span className="mr-4">{`${address?.substring(0, 6)}...${address?.substring(address.length - 4)}`}</span>
        <button onClick={() => disconnect()} className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md font-medium transition-colors">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => injectedConnector && connect({ connector: injectedConnector })}
      className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
    >
      Connect with MetaMask
    </button>
  );
};

export const Navbar = () => {
  return (
    <nav className="bg-purple-900 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold flex items-center">
              <span className="bg-pink-500 text-white px-2 py-1 rounded mr-2">D</span>
              <span>DotArbiter</span>
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link to="/" className="hover:bg-purple-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Home
              </Link>
              <Link to="/proposals" className="hover:bg-purple-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Proposals
              </Link>
              <Link to="/create-proposal" className="hover:bg-purple-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Create Proposal
              </Link>
              <Link to="/delegates" className="hover:bg-purple-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Delegates
              </Link>
              <Link to="/profile" className="hover:bg-purple-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Profile
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            <CustomConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
};