import { Link } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";

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
            <ConnectButton showBalance={false} />
          </div>
        </div>
      </div>
    </nav>
  );
};