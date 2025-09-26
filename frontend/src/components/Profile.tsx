import { useState, useEffect } from "react";
import { useReadContract, useAccount } from "wagmi";
import { governanceHubAbi, governanceHubAddress } from "../generated";

export const Profile = () => {
  const [votingPower, setVotingPower] = useState<number | null>(null);
  const [myDelegate, setMyDelegate] = useState<string | null>(null);
  const [delegatesMe, setDelegatesMe] = useState<string[]>([]);
  const [myProposals, setMyProposals] = useState<any[]>([]);
  
  const { address, chainId } = useAccount();
  
  // Use wagmi's useReadContract hook instead of calling readContract directly in useEffect
  const { data: myDelegateData, isLoading: delegateLoading } = useReadContract({
    address: chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422],
    abi: governanceHubAbi,
    functionName: "delegates",
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
  
  const { data: proposalCountData } = useReadContract({
    address: chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422],
    abi: governanceHubAbi,
    functionName: "proposalCount",
  });

  useEffect(() => {
    const fetchProposals = async () => {
      if (proposalCountData !== undefined && address) {
        const count = Number(proposalCountData);
        const fetchedProposals = [];
        for (let i = 1; i <= count; i++) {
          try {
            const { createPublicClient, http } = await import('viem');
            const rpcUrl = chainId === 31337 ? 'http://127.0.0.1:8545' : 'https://testnet-passet-hub-eth-rpc.polkadot.io';
            const publicClient = createPublicClient({ transport: http(rpcUrl) });
            const proposalData = await publicClient.readContract({
              address: chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422],
              abi: governanceHubAbi,
              functionName: "proposals",
              args: [BigInt(i)],
            });
            if (proposalData && Array.isArray(proposalData)) {
              const [
                id,
                proposer,
                description,
                forVotes,
                againstVotes,
                startTime,
                endTime,
                quorumRequired,
                majorityRequired,
                status,
              ] = proposalData;

              if (proposer.toLowerCase() === address.toLowerCase()) {
                console.log("Matching proposal found:", { id: Number(id), proposer, address });
                fetchedProposals.push({
                  id: Number(id),
                  description,
                  status,
                  forVotes,
                  againstVotes,
                });
              } else {
                console.log("Non-matching proposal:", { id: Number(id), proposer, address });
              }
            }
          } catch (err) {
            console.error(`Error fetching proposal ${i}:`, err);
          }
        }
        setMyProposals(fetchedProposals);
      }
    };
    fetchProposals();
  }, [proposalCountData, address, chainId]);

  // Set voting power to 1 for the demo
  useEffect(() => {
    if (address) {
      setVotingPower(1);
    }
  }, [address]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Member Profile</h1>
      
      {address ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Account Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-mono">{address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Voting Power</p>
                <p className="font-medium">{votingPower !== null ? votingPower : 'Loading...'} VP</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Delegation Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">You are delegating to:</h3>
                {myDelegate ? (
                  <p className="font-mono bg-gray-100 p-2 rounded">{myDelegate.substring(0, 6)}...{myDelegate.substring(myDelegate.length - 4)}</p>
                ) : (
                  <p className="text-gray-500">Not currently delegating</p>
                )}
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Addresses delegating to you:</h3>
                {delegatesMe.length > 0 ? (
                  <ul className="space-y-1">
                    {delegatesMe.map((addr, index) => (
                      <li key={index} className="font-mono text-sm bg-gray-100 p-1 rounded">
                        {addr.substring(0, 6)}...{addr.substring(addr.length - 4)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No one is delegating to you</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Your Proposals</h2>
              <span className="bg-pink-100 text-pink-800 text-sm px-3 py-1 rounded-full">
                {myProposals.length} total
              </span>
            </div>
            
            {myProposals.length > 0 ? (
              <div className="space-y-4">
                {myProposals.map((proposal) => (
                  <div key={proposal.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900">{proposal.description}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        proposal.status === 'Passed' ? 'bg-green-100 text-green-800' :
                        proposal.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {proposal.status}
                      </span>
                    </div>
                    
                    <div className="flex justify-between mt-3 text-sm text-gray-600">
                      <span>For: {proposal.forVotes}</span>
                      <span>Against: {proposal.againstVotes}</span>
                      <a href={`/proposal/${proposal.id}`} className="text-pink-600 hover:underline">
                        View details
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">You haven't created any proposals yet</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <p className="text-yellow-800">Please connect your wallet to view your profile</p>
        </div>
      )}
    </div>
  );
};