import * as viemChains from "viem/chains";
import { Hash, Address } from "viem";

const _SupportedChainList = Object.keys(viemChains) as Array<
    keyof typeof viemChains
>;
export type SupportedChain = (typeof _SupportedChainList)[number];

export type GetActivityParams = {
    twitterHandle: string;
};

export type Transaction = {
    hash: Hash;
    from: Address;
    to: Address;
    value: bigint;
    data?: `0x${string}`;
    chainId?: number;
    activityResults?: {
        wallets: string[];
        activityPoints: bigint[];
    } | null;
};