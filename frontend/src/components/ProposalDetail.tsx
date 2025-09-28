import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { governanceHubAbi, governanceHubAddress, proposalLogicAbi, delegationLogicAbi, xcmExecutorAbi } from "../generated";

export const ProposalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<any>(null);
  const [votingPower, setVotingPower] = useState<number>(1);
  const [isDelegate, setIsDelegate] = useState<boolean>(false);
  
  const { address, chainId } = useAccount();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const [myDelegate, setMyDelegate] = useState<string | null>(null);

  const { data: myDelegateData, isLoading: delegateLoading } = useReadContract({
    address: chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422],
    abi: delegationLogicAbi,
    functionName: "getDelegate",
    args: [address!],
    query: {
      enabled: !!address,
    },
  });

  const { data: delegatorCount, isLoading: delegatorCountLoading } = useReadContract({
    address: chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422],
    abi: delegationLogicAbi,
    functionName: "getDelegatorCount",
    args: [address!],
    query: {
      enabled: !!address,
    },
  });

  useEffect(() => {
    if (!delegatorCountLoading && delegatorCount !== undefined) {
      setIsDelegate(Number(delegatorCount) > 0);
    }
  }, [delegatorCount, delegatorCountLoading]);

  useEffect(() => {
    if (!delegateLoading && myDelegateData !== undefined) {
      setMyDelegate(myDelegateData as string);
    }
  }, [myDelegateData, delegateLoading]);

  const userHasDelegated = myDelegate && myDelegate !== "0x0000000000000000000000000000000000000000";

  useEffect(() => {
    const calculateVotingPower = async () => {
      if (!address || !chainId) return;

      if (userHasDelegated) {
        setVotingPower(0);
        return;
      }

      const { createPublicClient, http } = await import('viem');
      let rpcUrl = 'https://testnet-passet-hub-eth-rpc.polkadot.io'; // Default for 420420422
      if (chainId === 31337) {
        rpcUrl = 'http://127.0.0.1:8545'; // Local hardhat
      }
      
      const publicClient = createPublicClient({
        transport: http(rpcUrl),
      });

      const delegateChangedEvents = await publicClient.getLogs({
        address: chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422],
        event: {
          type: 'event',
          name: 'DelegateChanged',
          inputs: [
            { type: 'address', name: 'delegator', indexed: true },
            { type: 'address', name: 'fromDelegate', indexed: true },
            { type: 'address', name: 'toDelegate', indexed: true },
          ],
        },
        fromBlock: 0n,
        toBlock: 'latest',
      });

      const delegations = new Map<string, string>();
      for (const event of delegateChangedEvents) {
        if (event.args.delegator && event.args.toDelegate) {
          delegations.set(event.args.delegator.toLowerCase(), event.args.toDelegate.toLowerCase());
        }
      }

      let power = 1;
      for (const [delegator, delegate] of delegations.entries()) {
        if (delegate === address.toLowerCase()) {
          power++;
        }
      }

      setVotingPower(power);
    };

    calculateVotingPower();
  }, [address, chainId, userHasDelegated]);

  const { data: hasVoted, isLoading: isLoadingHasVoted } = useReadContract({
    address: chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422],
    abi: governanceHubAbi,
    functionName: "hasVoterVoted",
    args: [BigInt(id || "0"), address!],
    query: {
      enabled: !!id && !!address,
    },
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ 
      hash, 
    })
  
  // Use wagmi's useReadContract hook for fetching proposal data
  const { data: rawProposalData, isLoading, isError } = useReadContract({
    address: chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422],
    abi: governanceHubAbi,
    functionName: "proposals",
    args: [BigInt(id || "0")],
    query: {
      enabled: !!id
    }
  });

  useEffect(() => {
    if (rawProposalData && Array.isArray(rawProposalData) && id) {
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
      ] = rawProposalData;

      setProposal({
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
  }, [rawProposalData, id]);

  const handleVote = (support: boolean) => {
    if (!proposal || !chainId) return;
    
    const contractAddress = governanceHubAddress[chainId as keyof typeof governanceHubAddress] || governanceHubAddress[420420422];
    if (!contractAddress) {
      alert("Contract address not found for the current chain.");
      return;
    }

    setTimeout(() => {
      writeContract({
        address: contractAddress,
        abi: proposalLogicAbi,
        functionName: "vote" as any,
        args: [BigInt(proposal.id), support, BigInt(votingPower)] as any,
      });
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <p className="text-gray-600">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (!proposal || isError) {
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

          {address && proposal.status === 1 ? ( // Active status
            <div className="bg-gray-50 p-4 rounded-lg">
              {hasVoted ? (
                <p className="text-gray-700">You have already voted on this proposal.</p>
              ) : userHasDelegated ? (
                <p className="text-gray-700">You have delegated your vote and cannot vote directly.</p>
              ) : (
                <>
                  <p className="text-sm text-gray-700 mb-3">You have <span className="font-medium">{votingPower} voting power</span></p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleVote(true)}
                      disabled={isPending || isConfirming || isLoadingHasVoted}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
                    >
                      {isPending ? 'Processing...' : isConfirming ? 'Confirming...' : 'Vote For'}
                    </button>
                    <button
                      onClick={() => handleVote(false)}
                      disabled={isPending || isConfirming || isLoadingHasVoted}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
                    >
                      {isPending ? 'Processing...' : isConfirming ? 'Confirming...' : 'Vote Against'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : isConfirmed ? (
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
          <p className="text-gray-600">Proposal actions are not displayed in this demo.</p>
        </div>
      </div>

  const handleVoteByProxy = (support: boolean) => {
    if (!proposal || !chainId) return;
    
    const contractAddress = governanceHubAddress[chainId as keyof typeof governanceHubAddress] || governanceHubAddress[420420422];
    if (!contractAddress) {
      alert("Contract address not found for the current chain.");
      return;
    }

    writeContract({
      address: contractAddress,
      abi: proposalLogicAbi,
      functionName: "voteByProxy",
      args: [BigInt(proposal.id), support],
    });
  };

  const handleTallyProposal = () => {
    if (!proposal || !chainId) return;
    
    const contractAddress = governanceHubAddress[chainId as keyof typeof governanceHubAddress] || governanceHubAddress[420420422];
    if (!contractAddress) {
      alert("Contract address not found for the current chain.");
      return;
    }

    writeContract({
      address: contractAddress,
      abi: proposalLogicAbi,
      functionName: "tallyProposal",
      args: [BigInt(proposal.id)],
    });
  };

  const handleExecuteProposal = () => {
    if (!proposal || !chainId) return;
    
    const contractAddress = governanceHubAddress[chainId as keyof typeof governanceHubAddress] || governanceHubAddress[420420422];
    if (!contractAddress) {
      alert("Contract address not found for the current chain.");
      return;
    }

    writeContract({
      address: contractAddress,
      abi: xcmExecutorAbi,
      functionName: "executeProposal",
      args: [BigInt(proposal.id)],
    });
  };

  // ...

          {isDelegate && !hasVoted && proposal.status === 1 && (
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="text-sm text-gray-700 mb-3">You are a delegate. You can vote by proxy.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleVoteByProxy(true)}
                  disabled={isPending || isConfirming || isLoadingHasVoted}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Processing...' : isConfirming ? 'Confirming...' : 'Vote For by Proxy'}
                </button>
                <button
                  onClick={() => handleVoteByProxy(false)}
                  disabled={isPending || isConfirming || isLoadingHasVoted}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Processing...' : isConfirming ? 'Confirming...' : 'Vote Against by Proxy'}
                </button>
              </div>
            </div>
          )}

          {proposal.status === 1 && new Date() > new Date(proposal.endTime * 1000) && (
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Tally Proposal</h2>
              <p className="text-gray-600 mb-4">The voting period for this proposal has ended. It can now be tallied.</p>
              <button
                onClick={handleTallyProposal}
                disabled={isPending || isConfirming}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {isPending ? 'Processing...' : isConfirming ? 'Confirming...' : 'Tally Proposal'}
              </button>
            </div>
          )}

      {proposal.status === 2 && address && ( // Passed status
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Execute Proposal</h2>
          <p className="text-gray-600 mb-4">This proposal has passed and is ready for execution.</p>
          <button
            onClick={handleExecuteProposal}
            disabled={isPending || isConfirming}
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? 'Processing...' : isConfirming ? 'Confirming...' : 'Execute Proposal'}
          </button>
        </div>
      )}
    </div>
  );
};