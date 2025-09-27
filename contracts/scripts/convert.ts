import { encodeAddress } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';

const evmAddr = "0x0fD55d06B382C72d8b95f5Bf9Ae1682D079B79bB".toLowerCase();
const accountId32 = "0x000000000000000000000000" + evmAddr.slice(2);

const publicKey = hexToU8a(accountId32);

// SS58 prefixes for some networks
const prefixes = {
  Polkadot: 0,
  Kusama: 2,
  Paseo: 42,
  MoonbaseAlpha: 1287,
  Astar: 5,
};

for (const [name, prefix] of Object.entries(prefixes)) {
  console.log(`${name}: ${encodeAddress(publicKey, prefix)}`);
}
