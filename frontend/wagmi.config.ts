import { defineConfig, ContractConfig } from "@wagmi/cli";
import { Abi } from "viem";
import fs from "fs";
import path from "path";

// --- Paths and Initial Setup (No Changes) ---
let dirEntries: fs.Dirent[] = [];
let artifactDirEntries: fs.Dirent[] = [];
const deploymentsDir = path.join("..", "contracts", "ignition", "deployments");
const artifactsDir = path.join("..", "contracts", "artifacts", "contracts");

try {
  dirEntries.push(...fs.readdirSync(deploymentsDir, { recursive: true, withFileTypes: true }));
} catch (e) { /* ... error handling ... */ }

try {
  artifactDirEntries.push(...fs.readdirSync(artifactsDir, { recursive: true, withFileTypes: true }));
} catch (e) { /* ... error handling ... */ }

const deployedAddressesEntries = dirEntries.filter((entry) => entry.name === "deployed_addresses.json");
const allDirEntries = [...dirEntries, ...artifactDirEntries];
const artifactEntries = allDirEntries.filter(
  (entry) => entry.isFile() && (entry.parentPath.includes("artifacts") && entry.name.endsWith(".json") && !entry.name.endsWith(".dbg.json"))
);

if (artifactEntries.length === 0) {
  console.warn(`No contracts found. Compile first.`);
  process.exit(1);
}

// --- Build ABI Map (No Changes) ---
const abisByContractName: Record<string, Abi> = {};
for (const entry of artifactEntries) {
  const fileContents = fs.readFileSync(path.join(entry.parentPath, entry.name), "utf-8");
  const abi = JSON.parse(fileContents).abi as Abi;
  abisByContractName[entry.name.replace(/\.json$/, "")] = abi;
}

// --- Find Deployed Contracts (No Changes) ---
type ContractName = string;
const deployedContracts: Record<ContractName, ContractConfig> = {};
const chainIdRegex = /(chain-)(\d+)/;
for (const entry of deployedAddressesEntries) {
  const chainId = entry.parentPath.match(chainIdRegex)?.[2];
  if (!chainId) throw new Error(`chainId is missing in path ${entry.parentPath}`);
  const fileContents = fs.readFileSync(path.join(entry.parentPath, entry.name), "utf-8");
  for (const [name, address] of Object.entries(JSON.parse(fileContents)) as [ContractName, `0x${string}`][]) {
    const contractName = name.split("#").pop();
    if (!contractName) throw new Error(`Invalid contract name in deployment: ${name}`);
    const abi = abisByContractName[contractName];
    if (!abi) throw new Error(`Can't find abi for deployed contract ${contractName} in chain ${chainId}`);
    if (!deployedContracts[contractName]) deployedContracts[contractName] = { name: contractName, abi, address: {} };
    const addressMap = deployedContracts[contractName].address! as Record<number, `0x${string}`>;
    addressMap[parseInt(chainId)] = address;
  }
}

// ============================================================================
// --- THE CRITICAL FIX: Manually add non-deployed contracts for type generation ---
// ============================================================================
const contractsToProcess = [...Object.values(deployedContracts)];

// 1. Define the path to the Storage.sol artifact
const storageArtifactPath = path.join(artifactsDir, "Storage.sol", "Storage.json");

// 2. Read the artifact, parse it, and extract the ABI
try {
  const fileContents = fs.readFileSync(storageArtifactPath, "utf-8");
  const storageAbi = JSON.parse(fileContents).abi as Abi;

  // 3. Create a ContractConfig object for Storage. It won't have an address, which is fine.
  const storageContractConfig: ContractConfig = {
    name: "Storage",
    abi: storageAbi,
  };

  // 4. Add it to our final list of contracts
  contractsToProcess.push(storageContractConfig);
  console.log("✅ Successfully added Storage.sol ABI for type generation.");

} catch (e) {
  console.warn("⚠️ Could not find or process Storage.sol artifact. Struct types may be missing.");
}
// ============================================================================
// --- END OF FIX ---
// ============================================================================

export default defineConfig({
  out: "src/generated.ts",
  // Pass the augmented list of contracts to the generator
  contracts: contractsToProcess,
  plugins: [],
});