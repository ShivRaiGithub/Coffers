export * from "./providers/wallet.ts";
export * from "./types/index.ts";

import type { Plugin } from "@elizaos/core";
import { evmWalletProvider } from "./providers/wallet.ts";
import { getActivityAction } from "./actions/getActivity.ts";

export const getActivityPlugin: Plugin = {
    name: "getActivity",
    description: "EVM blockchain integration plugin for activity tracking",
    providers: [evmWalletProvider],
    evaluators: [],
    services: [],
    actions: [getActivityAction],
};

export default getActivityPlugin;
