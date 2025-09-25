import { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { governanceHubAbi, governanceHubAddress } from "../generated";

export const Delegates = () => {
  const [delegates, setDelegates] = useState<any[]>([]);
  const [selectedDelegate, setSelectedDelegate] = useState("");
  const [loading, setLoading] = useState(true);
  const [myDelegate, setMyDelegate] = useState<string | null>(null);
  
  const { address, chainId } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  // Get the current delegate for the connected user
  useEffect(() => {
    const fetchMyDelegate = async () => {
      if (address && chainId) {
        try {
          const contractAddress = governanceHubAddress[chainId as keyof typeof governanceHubAddress] || governanceHubAddress[420420422];
          if (!contractAddress) {
            throw new Error(`Contract address not found for chain ID: ${chainId}`);
          }
          
          // Instead of using getPublicClient, let's just use the account's chainId directly
          // and use a more direct approach for read operations
          const { createPublicClient, http } = await import('viem');
          
          // Determine the RPC URL based on the detected chainId
          let rpcUrl = 'https://testnet-passet-hub-eth-rpc.polkadot.io'; // Default for 420420422
          if (chainId === 31337) {
            rpcUrl = 'http://127.0.0.1:8545'; // Local hardhat
          }
          
          const publicClient = createPublicClient({
            transport: http(rpcUrl),
          });
          
          const result = await publicClient.readContract({
            address: contractAddress,
            abi: governanceHubAbi,
            functionName: "delegates",
            args: [address],
          });
          
          setMyDelegate(result as string);
        } catch (err) {
          console.error("Error fetching delegate:", err);
        }
      }
    };

    fetchMyDelegate();
  }, [address, chainId]);

  const handleDelegate = async () => {
    if (!selectedDelegate) {
      alert("Please select a delegate address");
      return;
    }

    try {
      const contractAddress = chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422];
      if (!contractAddress) {
        throw new Error(`Contract address not found for chain ID: ${chainId}`);
      }
      
      await writeContract({
        address: contractAddress,
        abi: governanceHubAbi,
        functionName: "delegate" as any,
        args: [selectedDelegate as `0x${string}`] as any,
      });
      
      // Refresh the delegate after successful delegation
      setMyDelegate(selectedDelegate);
    } catch (err) {
      console.error("Error delegating vote:", err);
      alert("Failed to delegate vote. Please check the console for more details.");
    }
  };

  const handleUndelegate = async () => {
    try {
      const contractAddress = chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422];
      if (!contractAddress) {
        throw new Error(`Contract address not found for chain ID: ${chainId}`);
      }
      
      await writeContract({
        address: contractAddress,
        abi: governanceHubAbi,
        functionName: "undelegate" as any,
        args: [] as any,
      });
      
      setMyDelegate(null);
    } catch (err) {
      console.error("Error undelegating vote:", err);
      alert("Failed to undelegate vote. Please check the console for more details.");
    }
  };

  // For this example, we'll use some mock delegates
  // In a real app, you might fetch from a list of registered delegates
  useEffect(() => {
    const mockDelegates = [
      {
        address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        name: "Alice",
        votesReceived: 125,
        description: "Active community member with experience in governance"
      },
      {
        address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        name: "Bob",
        votesReceived: 89,
        description: "Technical expert focused on protocol development"
      },
      {
        address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        name: "Carol",
        votesReceived: 210,
        description: "Long-term contributor with deep understanding of the ecosystem"
      }
    ];
    
    setDelegates(mockDelegates);
    setLoading(false);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Delegates</h1>
      
      {address ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Delegation Status</h2>
          
          {myDelegate ? (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-gray-600">You have delegated your voting power to:</p>
                <p className="font-medium">{myDelegate.substring(0, 6)}...{myDelegate.substring(myDelegate.length - 4)}</p>
              </div>
              <button
                onClick={handleUndelegate}
                disabled={isPending}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {isPending ? 'Processing...' : 'Remove Delegation'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">You are not currently delegating your voting power to anyone.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedDelegate}
                  onChange={(e) => setSelectedDelegate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">Select a delegate</option>
                  {delegates.map((delegate) => (
                    <option key={delegate.address} value={delegate.address}>
                      {delegate.name} ({delegate.address.substring(0, 6)}...{delegate.address.substring(delegate.address.length - 4)})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleDelegate}
                  disabled={isPending || !selectedDelegate}
                  className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Processing...' : 'Delegate Vote'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8 text-center">
          <p className="text-yellow-800">Please connect your wallet to manage your delegation</p>
        </div>
      )}

      <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Delegates</h2>
      
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading delegates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {delegates.map((delegate) => (
            <div key={delegate.address} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">{delegate.name}</h3>
                    <p className="text-sm text-gray-500">{delegate.address.substring(0, 6)}...{delegate.address.substring(delegate.address.length - 4)}</p>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4">{delegate.description}</p>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Votes received:</span>
                  <span className="font-medium">{delegate.votesReceived}</span>
                </div>
                
                {!myDelegate && (
                  <button
                    onClick={() => {
                      setSelectedDelegate(delegate.address);
                    }}
                    className="mt-4 w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-md font-medium transition-colors"
                  >
                    Select as Delegate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};