import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { governanceHubAbi, governanceHubAddress } from "../generated";

export const ProposalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<any>(null);
  const [votingPower, setVotingPower] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  useEffect(() => {
    const fetchProposal = async () => {
      if (id) {
        try {
          const result = await useReadContract({
            address: governanceHubAddress[31337] || governanceHubAddress[420420422],
            abi: governanceHubAbi,
            functionName: "getProposal",
            args: [BigInt(id)],
          });
          
          if (result) {
            setProposal({
              id: Number(id),
              ...result,
            });
          }
        } catch (err) {
          console.error("Error fetching proposal:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    // Mock voting power for now
    setVotingPower(100);
    fetchProposal();
  }, [id]);

  const handleVote = async (support: boolean) => {
    if (!proposal) return;
    
    try {
      await writeContract({
        address: governanceHubAddress[31337] || governanceHubAddress[420420422],
        abi: governanceHubAbi,
        functionName: "vote",
        args: [BigInt(proposal.id), support, BigInt(votingPower)],
      });
      
      setVoteSubmitted(true);
    } catch (err) {
      console.error("Error voting:", err);
      alert("Failed to submit vote. Please check the console for more details.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <p className="text-gray-600">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Proposal not found</h3>
          <p className="text-gray-500 mb-4">The proposal you're looking for doesn't exist</p>
          <Link to="/proposals" className="text-pink-600 hover:underline">
            Browse all proposals
          </Link>
        </div>
      </div>
    );
  }

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

  // Calculate voting stats
  const totalVotes = Number(proposal.forVotes || 0) + Number(proposal.againstVotes || 0);
  const forPercentage = totalVotes > 0 ? (Number(proposal.forVotes || 0) / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (Number(proposal.againstVotes || 0) / totalVotes) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <Link to="/proposals" className="text-pink-600 hover:underline flex items-center">
          <span>← Back to Proposals</span>
        </Link>
        <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(proposal.status)}`}>
          {getStatusText(proposal.status)}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposal #{proposal.id}</h1>
              <p className="text-gray-700 whitespace-pre-line">{proposal.description}</p>
            </div>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-600">Proposed by:</span>
              <p className="font-medium">{proposal.proposer?.substring(0, 6)}...{proposal.proposer?.substring(proposal.proposer.length - 4)}</p>
            </div>
            <div>
              <span className="text-gray-600">Start time:</span>
              <p className="font-medium">{new Date(Number(proposal.startTime) * 1000).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-600">End time:</span>
              <p className="font-medium">{new Date(Number(proposal.endTime) * 1000).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Voting</h2>
          
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>For: {Number(proposal.forVotes || 0)}</span>
              <span>Against: {Number(proposal.againstVotes || 0)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-green-600 h-2.5 rounded-full" 
                style={{ width: `${forPercentage}%` }}
              ></div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
              <div 
                className="bg-red-600 h-2.5 rounded-full" 
                style={{ width: `${againstPercentage}%` }}
              ></div>
            </div>
          </div>

          {address && proposal.status === 1 && !voteSubmitted ? ( // Active status
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 mb-3">You have <span className="font-medium">{votingPower} voting power</span></p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleVote(true)}
                  disabled={isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Processing...' : 'Vote For'}
                </button>
                <button
                  onClick={() => handleVote(false)}
                  disabled={isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Processing...' : 'Vote Against'}
                </button>
              </div>
            </div>
          ) : voteSubmitted ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg">
              <p>Your vote has been submitted successfully!</p>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              {proposal.status === 2 ? ( // Passed
                <p className="text-green-700">This proposal has passed</p>
              ) : proposal.status === 3 ? ( // Failed
                <p className="text-red-700">This proposal has failed</p>
              ) : proposal.status === 4 ? ( // Executed
                <p className="text-purple-700">This proposal has been executed</p>
              ) : proposal.status === 0 ? ( // Pending
                <p className="text-gray-700">This proposal is pending</p>
              ) : (
                <p className="text-gray-700">Voting is not active for this proposal</p>
              )}
            </div>
          )}
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Actions</h2>
          <p>Actions would be listed here. (Implementation for cross-chain actions would go here)</p>
        </div>
      </div>

      {proposal.status === 2 && address && ( // Passed status
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Execute Proposal</h2>
          <p className="text-gray-600 mb-4">This proposal has passed and is ready for execution.</p>
          <button
            // In a real app, this would call executeProposal
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
          >
            Execute Proposal
          </button>
        </div>
      )}
    </div>
  );
};