import { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { delegationLogicAbi, governanceHubAddress } from "../generated";

const hardcodedDelegates = [
  {
    address: "0x09ef97ea756496cd7a8E6a045B033A17A0B2B4A0",
    name: "Alice",
    description: "Active community member with experience in governance"
  },
  {
    address: "0xB6151687Df2497AF69c0b2eB35Bbee18B9F62C06",
    name: "Bob",
    description: "Technical expert focused on protocol development"
  },
  {
    address: "0x3cb6A70E6B60dC5b7d614dDa937AAe170f9D3c79",
    name: "Carol",
    description: "Long-term contributor with deep understanding of the ecosystem"
  }
];

export const Delegates = () => {
  const [myDelegate, setMyDelegate] = useState<string | null>(null);
  
  const { address, chainId } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  const { data: myDelegateData, isLoading: delegateLoading } = useReadContract({
    address: chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422],
    abi: delegationLogicAbi,
    functionName: "getDelegate",
    args: [address!],
    query: {
      enabled: !!address
    }
  }) as { data: string | undefined; isLoading: boolean };

  useEffect(() => {
    if (!delegateLoading && myDelegateData !== undefined) {
      setMyDelegate(myDelegateData);
    }
  }, [myDelegateData, delegateLoading]);

  const handleDelegate = (delegateAddress: string) => {
    const contractAddress = chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422];
    if (!contractAddress) {
      alert("Contract address not found for the current chain.");
      return;
    }

    writeContract({
      address: contractAddress,
      abi: delegationLogicAbi,
      functionName: "delegate",
      args: [delegateAddress as `0x${string}`],
    });
  };

  const handleUndelegate = () => {
    const contractAddress = chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422];
    if (!contractAddress) {
      alert("Contract address not found for the current chain.");
      return;
    }

    writeContract({
      address: contractAddress,
      abi: delegationLogicAbi,
      functionName: "undelegate",
      args: [],
    });
  };

  const userHasDelegated = myDelegate && myDelegate !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Delegates</h1>
      
      {address ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Delegation Status</h2>
          
          {userHasDelegated ? (
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
            <p className="text-gray-600 mb-4">You are not currently delegating your voting power to anyone.</p>
          )}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8 text-center">
          <p className="text-yellow-800">Please connect your wallet to manage your delegation</p>
        </div>
      )}

      <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Delegates</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hardcodedDelegates.map((delegate) => (
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
              
              {address && !userHasDelegated && (
                <button
                  onClick={() => handleDelegate(delegate.address)}
                  disabled={isPending}
                  className="mt-4 w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Processing...' : 'Delegate Vote'}
                </button>
              )}
              
              {address && userHasDelegated && myDelegate === delegate.address && (
                <p className="mt-4 text-center text-gray-500 font-medium">You have delegated to this user</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
