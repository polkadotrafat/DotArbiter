import { useAccount } from "wagmi";
import "./App.css";
import { governanceHubAddress } from "./generated";

import polkadotLogo from "./assets/polkadot-logo.svg";


function App() {
  const accountData = useAccount();

  // Get the correct contract address based on the chain ID
  const contractAddress = governanceHubAddress[420420422];

  return (
    <div className="min-h-screen bg-gray-50">
      
      
      <div className="container mx-auto px-4 py-8">
        <header className="flex flex-col items-center mb-8">
          <img src={polkadotLogo} className="h-24 mb-4" alt="Polkadot logo" />
          <h1 className="text-3xl font-bold text-purple-900">DotArbiter DAO</h1>
          <p className="text-gray-600 mt-2">Multi-chain Governance Protocol</p>
        </header>

        {accountData.connector !== undefined ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-purple-800 mb-4">Wallet Connected</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Chain ID:</span> {accountData.chainId}</p>
              <p><span className="font-medium">Connected Address:</span> {accountData.address?.substring(0, 6)}...{accountData.address?.substring(accountData.address.length - 4)}</p>
              <p><span className="font-medium">Contract Address:</span> {contractAddress?.substring(0, 6)}...{contractAddress?.substring(contractAddress.length - 4)}</p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6 text-center">
            <p className="text-yellow-800">Please connect your MetaMask wallet to interact with the DAO</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Welcome to DotArbiter</h2>
          <p className="text-gray-600 mb-4">
            DotArbiter is a multi-chain DAO governance protocol built on Polkadot's Asset Hub. 
            It enables cross-chain proposals and voting across multiple parachains from a single interface.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="border rounded-lg p-4 text-center">
              <h3 className="font-medium text-purple-700">Create Proposals</h3>
              <p className="text-sm text-gray-600 mt-2">Submit cross-chain governance proposals</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <h3 className="font-medium text-purple-700">Vote & Delegate</h3>
              <p className="text-sm text-gray-600 mt-2">Vote on proposals or delegate your voting power</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <h3 className="font-medium text-purple-700">Cross-Chain Execution</h3>
              <p className="text-sm text-gray-600 mt-2">Proposals executed across multiple parachains</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
