import { useState } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { governanceHubAbi, governanceHubAddress } from "../generated";

export const CreateProposal = () => {
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState([
    { targetParaId: 0, target: "", value: "", calldata: "", description: "" }
  ]);
  
  const { address } = useAccount();
  const { writeContract, isPending, isSuccess } = useWriteContract();

  const handleAddAction = () => {
    setActions([
      ...actions,
      { targetParaId: 0, target: "", value: "", calldata: "", description: "" }
    ]);
  };

  const handleRemoveAction = (index: number) => {
    if (actions.length > 1) {
      const newActions = [...actions];
      newActions.splice(index, 1);
      setActions(newActions);
    }
  };

  const handleActionChange = (index: number, field: string, value: string) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], [field]: value };
    setActions(newActions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      alert("Please enter a proposal description");
      return;
    }

    // Prepare actions in the format expected by the contract
    const formattedActions = actions.map(action => [
      action.targetParaId,
      action.target,
      action.value ? BigInt(action.value) : 0n,
      action.calldata || "0x",
      action.description
    ]);

    try {
      await writeContract({
        address: governanceHubAddress[31337] || governanceHubAddress[420420422],
        abi: governanceHubAbi,
        functionName: "createProposal",
        args: [description, formattedActions],
      });
    } catch (err) {
      console.error("Error creating proposal:", err);
      alert("Failed to create proposal. Please check the console for more details.");
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            rows={4}
            placeholder="Describe the purpose and details of your proposal..."
            required
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Actions</h2>
            <button
              type="button"
              onClick={handleAddAction}
              className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
              Add Action
            </button>
          </div>

          {actions.map((action, index) => (
            <div key={index} className="mb-4 p-4 border border-gray-200 rounded-md">
              <div className="flex justify-between items-center mb-3">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Parachain ID
                  </label>
                  <input
                    type="number"
                    value={action.targetParaId}
                    onChange={(e) => handleActionChange(index, "targetParaId", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="0 for Asset Hub, 2000 for Statemint, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Address
                  </label>
                  <input
                    type="text"
                    value={action.target}
                    onChange={(e) => handleActionChange(index, "target", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono text-sm"
                    placeholder="0x..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value (wei)
                  </label>
                  <input
                    type="text"
                    value={action.value}
                    onChange={(e) => handleActionChange(index, "value", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={action.description}
                    onChange={(e) => handleActionChange(index, "description", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Action description"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calldata (hex)
                  </label>
                  <input
                    type="text"
                    value={action.calldata}
                    onChange={(e) => handleActionChange(index, "calldata", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono text-sm"
                    placeholder="0x..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            You are creating this proposal as: {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
          </p>
          <button
            type="submit"
            disabled={isPending}
            className={`bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-md font-medium transition-colors ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isPending ? 'Creating...' : 'Create Proposal'}
          </button>
        </div>

        {isSuccess && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
            Proposal created successfully!
          </div>
        )}
      </form>
    </div>
  );
};