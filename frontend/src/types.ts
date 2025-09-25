import { type Abi } from "viem";

export type ContractData = {
  contractName: string;
  sourceName: string;
  abi: Abi;
  bytecode: string;
}
