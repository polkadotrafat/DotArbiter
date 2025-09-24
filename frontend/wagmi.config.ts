import { defineConfig, ContractConfig } from "@wagmi/cli";
import { Abi } from "viem";
import fs from "fs";
import path from "path";

let dirEntries: fs.Dirent[] = [];
let artifactDirEntries: fs.Dirent[] = [];

const deploymentsDir = path.join("..", "contracts", "ignition", "deployments");
const artifactsDir = path.join("..", "contracts", "artifacts", "contracts");

try {
  dirEntries.push(
    ...fs.readdirSync(deploymentsDir, { recursive: true, withFileTypes: true })
  );
} catch (e: unknown) {
  if (!(e instanceof Error && "code" in e && e.code === "ENOENT")) {
    throw e;
  }

  console.warn(`No contracts found in ${deploymentsDir}. Deploy one first.`);
  process.exit(1);
}

try {
  artifactDirEntries.push(
    ...fs.readdirSync(artifactsDir, { recursive: true, withFileTypes: true })
  );
} catch (e: unknown) {
  if (!(e instanceof Error && "code" in e && e.code === "ENOENT")) {
    throw e;
  }

  console.warn(`No artifacts found in ${artifactsDir}. Compile contracts first.`);
  process.exit(1);
}

const deployedAddressesEntries = dirEntries.filter((entry) => entry.name === "deployed_addresses.json");

// Include artifacts from both the deployments directory and the main artifacts directory
const allDirEntries = [...dirEntries, ...artifactDirEntries];
const artifactEntries = allDirEntries.filter(
  (entry) => entry.isFile() && (entry.parentPath.includes("artifacts") && entry.name.endsWith(".json") && !entry.name.endsWith(".dbg.json"))
);

if (artifactEntries.length === 0) {
  console.warn(`No contracts found in ${deploymentsDir}. Deploy one first.`);
  process.exit(1);
}

const abisByContractName: Record<string, Abi> = {};

for (const entry of artifactEntries) {
  const fileContents = fs.readFileSync(path.join(entry.parentPath, entry.name), "utf-8");
  const abi = JSON.parse(fileContents).abi as Abi;

  abisByContractName[entry.name.replace(/\.json$/, "")] = abi;
}

type ContractName = string;
const deployedContracts: Record<ContractName, ContractConfig> = {};

const chainIdRegex = /(chain-)(\d+)/;
for (const entry of deployedAddressesEntries) {
  const chainId = entry.parentPath.match(chainIdRegex)?.[2];
  if (!chainId) {
    throw new Error(`chainId is missing in path ${entry.parentPath}`);
  }
  const fileContents = fs.readFileSync(path.join(entry.parentPath, entry.name), "utf-8");

  for (const [name, address] of Object.entries(JSON.parse(fileContents)) as [ContractName, `0x${string}`][]) {
    // Extract the actual contract name from the deployment name
    const contractName = name.split("#").pop(); // This will give "GovernanceHub" from "DeployAndSetupGovernance#GovernanceHub"
    if (!contractName) {
      throw new Error(`Invalid contract name in deployment: ${name}`);
    }

    const abi = abisByContractName[contractName]; // Use contractName here
    if (!abi) {
      throw new Error(`Can't find abi for deployed contract ${contractName} in chain ${chainId}`);
    }

    if (!deployedContracts[contractName]) deployedContracts[contractName] = { name: contractName, abi, address: {} }; // Use contractName here
    const addressMap = deployedContracts[contractName].address! as Record<number, `0x${string}`>;
    addressMap[parseInt(chainId)] = address;
  }
}

if (process.env.DEBUG === "1") {
  console.log("deployedAddressesEntries", deployedAddressesEntries);
  console.log("artifactEntries", artifactEntries);
  console.log("deployedAddresses", deployedContracts);
}

export default defineConfig({
  out: "src/generated.ts", contracts: Object.values(deployedContracts), plugins: []
});
