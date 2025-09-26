import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useReadContract, useAccount } from "wagmi";
import { governanceHubAbi, governanceHubAddress } from "../generated";

export const Proposals = () => {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { chainId } = useAccount();
  const { data: proposalCountData } = useReadContract({
    address: chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422],
    abi: governanceHubAbi,
    functionName: "proposalCount",
  });

  useEffect(() => {
    const fetchProposals = async () => {
      setLoading(true);
      try {
        if (proposalCountData !== undefined) {
          const count = Number(proposalCountData);
          const fetchedProposals = [];
          
          for (let i = 1; i <= count; i++) {
            try {
              const { createPublicClient, http } = await import('viem');
              
              // Determine the RPC URL based on the detected chainId
              let rpcUrl = 'https://testnet-passet-hub-eth-rpc.polkadot.io'; // Default for 420420422
              if (chainId === 31337) {
                rpcUrl = 'http://127.0.0.1:8545'; // Local hardhat
              }
              
              const publicClient = createPublicClient({
                transport: http(rpcUrl),
              });
              
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

                fetchedProposals.push({
                  id: Number(id),
                  proposer,
                  description,
                  forVotes,
                  againstVotes,
                  startTime,
                  endTime,
                  quorumRequired,
                  majorityRequired,
                  status,
                });
              }
            } catch (err) {
              console.error(`Error fetching proposal ${i}:`, err);
            }
          }
          
          setProposals(fetchedProposals);
        }
      } catch (err) {
        console.error("Error fetching proposals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, [proposalCountData, chainId]);

  const getStatusText = (status: number) => {
    const statusTexts = ["Pending", "Active", "Passed", "Failed", "Executed"];
    return statusTexts[status] || "Unknown";
  };

  const getStatusColor = (status: number) => {
    const statusColors = [
      "bg-gray-100 text-gray-800",
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-red-100 text-red-800",
      "bg-purple-100 text-purple-800"
    ];
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Proposals</h1>
        <Link 
          to="/create-proposal" 
          className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          Create Proposal
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading proposals...</p>
        </div>
      ) : proposals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No proposals yet</h3>
          <p className="text-gray-500 mb-4">Be the first to create a proposal for the DAO</p>
          <Link 
            to="/create-proposal" 
            className="inline-block bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Create Proposal
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proposals.map((proposal) => (
            <Link 
              key={proposal.id} 
              to={`/proposal/${proposal.id}`}
              className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {proposal.description}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(proposal.status)}`}>
                    {getStatusText(proposal.status)}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Proposal ID:</span>
                    <span className="font-medium">#{proposal.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Proposer:</span>
                    <span className="font-medium truncate max-w-[100px]">{proposal.proposer?.toString().substring(0, 6)}...{proposal.proposer?.toString().substring(proposal.proposer.length - 4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>For:</span>
                    <span className="font-medium text-green-600">{Number(proposal.forVotes || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Against:</span>
                    <span className="font-medium text-red-600">{Number(proposal.againstVotes || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-medium ${proposal.status === 2 ? 'text-green-600' : proposal.status === 3 ? 'text-red-600' : 'text-blue-600'}`}>
                      {getStatusText(proposal.status)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};