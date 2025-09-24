import { createConfig, http, createStorage, cookieStorage } from "wagmi";
import { injected } from 'wagmi/connectors'
import { type Chain } from "viem";

const passetHub = {
  id: 420420422,
  name: "Passet Hub",
  nativeCurrency: {
    name: "PAS",
    symbol: "PAS",
    decimals: 12
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-passet-hub-eth-rpc.polkadot.io"]
    }
  }
} as const satisfies Chain;

// Local Hardhat network for development
const localhost = {
  id: 31337,
  name: "Hardhat",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"]
    }
  }
} as const satisfies Chain;

export const chains = [passetHub, localhost] as const;

export const config = createConfig({
  chains,
  connectors: [
    injected({
      target: 'metaMask',
    }),
  ],
  transports: {
    [passetHub.id]: http(),
    [localhost.id]: http(),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
