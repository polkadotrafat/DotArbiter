import { useState } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { proposalLogicAbi, governanceHubAddress } from "../generated"; // Assumes wagmi-cli generation
import { createRemarkXcmForDotArbiter, createTransferXcmForDotArbiter } from "../utils/xcm-helpers";
import { ethers, parseUnits } from "ethers";
import type { Abi } from "viem";


// Define a structured state for managing different types of actions
type ActionType = 'local' | 'xcm_remark' | 'xcm_transfer_pas';

interface ActionState {
  type: ActionType;
  // `params` holds the user-friendly inputs for each action type
  params: { [key: string]: string };
  // These fields are used for the 'local' type and as fallbacks
  targetParaId: string;
  target: string;
  value: string;
  calldata: string;
  description: string;
}

export const CreateProposal = () => {
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState<ActionState[]>([
    { type: 'local', params: {}, targetParaId: "0", target: "", value: "0", calldata: "0x", description: "" }
  ]);
  
  const { address, chainId } = useAccount();
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  // --- UI Handler Functions ---

  const handleAddAction = () => {
    setActions([...actions, { type: 'local', params: {}, targetParaId: "0", target: "", value: "0", calldata: "0x", description: "" }]);
  };

  const handleRemoveAction = (index: number) => {
    if (actions.length > 1) {
      const newActions = actions.filter((_, i) => i !== index);
      setActions(newActions);
    }
  };

  const handleActionChange = (index: number, field: string, value: any, isParam: boolean = false) => {
    const newActions = [...actions];
    const action = { ...newActions[index] };

    if (isParam) {
      action.params = { ...action.params, [field]: value };
    } else {
      (action as any)[field] = value;
    }
    
    // If the type changes, reset specific params to avoid carrying over old data
    if (field === 'type') {
      action.params = {};
    }
    
    newActions[index] = action;
    setActions(newActions);
  };

  // --- Core Logic: Handle Submission and XCM Generation ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { alert("Please enter a proposal description."); return; }

    try {
      const processedActions = await Promise.all(actions.map(async (action) => {
        let finalCalldata: `0x${string}` = "0x";
        let finalTargetParaId: number = 0;
        let finalTarget: `0x${string}` = ethers.ZeroAddress as `0x${string}`;
        let finalValue: bigint = 0n;

        switch (action.type) {
          case 'xcm_remark':
            if (!action.params.remarkText) throw new Error("Action: Remark text is required.");
            finalCalldata = await createRemarkXcmForDotArbiter(action.params.remarkText) as `0x${string}`;
            finalTargetParaId = 0;
            finalTarget = "0x0000000000000000000000000000000000000001";
            break;

          case 'xcm_transfer_pas':
            if (!action.params.recipient) throw new Error("Action: Recipient address is required.");
            if (!action.params.amount) throw new Error("Action: Amount is required.");
            const amountInPlancks = parseUnits(action.params.amount, 10);
            finalTargetParaId = parseInt(action.targetParaId, 10) || 0;
            finalCalldata = await createTransferXcmForDotArbiter(finalTargetParaId, action.params.recipient, amountInPlancks) as `0x${string}`;
            finalTarget = "0x0000000000000000000000000000000000000001";
            break;

          case 'local':
          default:
            finalTargetParaId = parseInt(action.targetParaId, 10) || 0;
            // Add the type cast here
            finalTarget = (action.target || ethers.ZeroAddress) as `0x${string}`;
            finalValue = action.value ? BigInt(action.value) : 0n;
            // Add the type cast here
            finalCalldata = (action.calldata || "0x") as `0x${string}`;
            break;
        }

        // Return an array that matches the order of components in the struct
        return [
          finalTargetParaId,
          finalTarget,
          finalValue,
          finalCalldata,
          action.description,
        ];
      }));

      const contractAddress = chainId ? governanceHubAddress[chainId as keyof typeof governanceHubAddress] : governanceHubAddress[420420422];
      if (!contractAddress) {
        throw new Error("Contract address not found for the current network.");
      }
      
      await writeContract({
        address: contractAddress,
        abi: proposalLogicAbi as Abi,
        functionName: "createProposal",
        args: [description, processedActions],
      });

    } catch (err) {
      console.error("Error creating proposal:", err);
      alert(`Failed to create proposal: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Create Proposal</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Proposal Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={4}
            placeholder="e.g., 'Q3 budget allocation and contributor payments'"
            required
          />
        </div>

        {actions.map((action, index) => (
          <div key={index} className="mb-4 p-4 border border-gray-200 rounded-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium text-gray-900">Action {index + 1}</h3>
              {actions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveAction(index)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
              <select
                value={action.type}
                onChange={(e) => handleActionChange(index, "type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="local">Advanced: Local EVM Call</option>
                <option value="xcm_remark">XCM: System Remark on Relay Chain</option>
                <option value="xcm_transfer_pas">XCM: Transfer PAS from Relay Chain Treasury</option>
              </select>
            </div>

            {action.type === 'local' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium">Target Parachain ID</label><input className="w-full px-3 py-2 border rounded-md" type="number" value={action.targetParaId} onChange={e => handleActionChange(index, 'targetParaId', e.target.value)} /></div>
                <div><label className="block text-sm font-medium">Target Address</label><input className="w-full px-3 py-2 border rounded-md" type="text" value={action.target} onChange={e => handleActionChange(index, 'target', e.target.value)} required placeholder="0x..." /></div>
                <div><label className="block text-sm font-medium">Value (wei)</label><input className="w-full px-3 py-2 border rounded-md" type="text" value={action.value} onChange={e => handleActionChange(index, 'value', e.target.value)} placeholder="0" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium">Calldata (hex)</label><input className="w-full px-3 py-2 border rounded-md" type="text" value={action.calldata} onChange={e => handleActionChange(index, 'calldata', e.target.value)} placeholder="0x..." /></div>
              </div>
            )}

            {action.type === 'xcm_remark' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remark Message</label>
                <input
                  type="text"
                  value={action.params.remarkText || ''}
                  onChange={(e) => handleActionChange(index, "remarkText", e.target.value, true)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter message to post on Relay Chain" required
                />
              </div>
            )}

            {action.type === 'xcm_transfer_pas' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Parachain ID</label>
                  <input
                    type="number"
                    value={action.targetParaId || ''}
                    onChange={(e) => handleActionChange(index, "targetParaId", e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="e.g., 1000" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Address (Substrate)</label>
                  <input
                    type="text"
                    value={action.params.recipient || ''}
                    onChange={(e) => handleActionChange(index, "recipient", e.target.value, true)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="14uWAH..." required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (in PAS)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={action.params.amount || ''}
                    onChange={(e) => handleActionChange(index, "amount", e.target.value, true)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="10.5" required
                  />
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <label className="block text-sm font-medium">Action Description</label>
              <input type="text" value={action.description} onChange={e => handleActionChange(index, 'description', e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="e.g., Q3 payment to contributor" required/>
            </div>
          </div>
        ))}

        <div className="mt-6 flex justify-between items-center">
          <button type="button" onClick={handleAddAction} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-medium transition-colors">
            Add Another Action
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={`bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-md font-medium transition-colors ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isPending ? 'Creating...' : 'Create Proposal'}
          </button>
        </div>

        {isSuccess && <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">Proposal created successfully!</div>}
        {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">Error: {error.message}</div>}
      </form>
    </div>
  );
};