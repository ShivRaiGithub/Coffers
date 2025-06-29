/**
 * @fileoverview This file contains the implementation of the GetActivityAction class and the getActivityAction handler.
 * It interacts with a smart contract on the Ethereum Sepolia testnet to get activity points for wallet addresses
 * associated with a Twitter handle.
 */

import { formatEther, parseEther, getContract, parseEventLogs } from "viem";
import {
    Action,
    composeContext,
    generateObjectDeprecated,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";

import { initWalletProvider, WalletProvider } from "../providers/wallet.ts";
import type { GetActivityParams, Transaction } from "../types/index.ts";
import { getActivityTemplate } from "../templates/index.ts";
import getActivityJson from "../artifacts/GetActivity.json" with { type: "json" };
import { GetActivityConfig } from "../config/getActivity.ts";

/**
 * Class representing the GetActivityAction.
 */
export class GetActivityAction {
    /**
     * Creates an instance of GetActivityAction.
     * @param {WalletProvider} walletProvider - The wallet provider instance.
     */
    constructor(private walletProvider: WalletProvider) {}

    /**
     * Polls for activity results by watching for ActivityCalculated events
     * @param {string} twitterHandle - The Twitter handle to check for
     * @param {string} transactionHash - The transaction hash to monitor
     * @param {number} maxAttempts - Maximum number of polling attempts
     * @param {number} delayMs - Delay between attempts in milliseconds
     * @returns {Promise<{wallets: string[], activityPoints: bigint[]} | null>}
     */
    async pollForResults(
        twitterHandle: string,
        transactionHash: string,
        maxAttempts: number = 20, 
        delayMs: number = GetActivityConfig.POLLING_DELAY_MS
    ): Promise<{wallets: string[], activityPoints: bigint[]} | null> {
        const chainName = GetActivityConfig.CHAIN_NAME;
        const contractAddress: `0x${string}` = GetActivityConfig.GET_ACTIVITY_CONTRACT_ADDRESS as `0x${string}`;
        
        const publicClient = this.walletProvider.getPublicClient("sepolia");
        const abi = getActivityJson;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                console.log(`Polling attempt ${attempt + 1}/${maxAttempts} for Twitter handle: ${twitterHandle}`);
                
                // Get the current block number and look back more blocks
                const currentBlock = await publicClient.getBlockNumber();
                const fromBlock = currentBlock - BigInt(GetActivityConfig.POLLING_BLOCK_LOOKBACK); // Look back specified blocks
                
                // Watch specifically for ActivityCalculated events from the contract
                const events = await publicClient.getLogs({
                    address: contractAddress,
                    fromBlock: fromBlock,
                    toBlock: 'latest',
                });
                
                console.log(`Found ${events.length} total events from contract`);
                
                if (events.length > 0) {
                    // Parse the events to find ActivityCalculated
                    for (const event of events) {
                        try {
                            const parsedEvents = parseEventLogs({
                                abi,
                                logs: [event]
                            });
                            
                            for (const parsedEvent of parsedEvents) {
                                console.log(`Parsed event: ${(parsedEvent as any).eventName}`);
                                
                                if ((parsedEvent as any).eventName === 'ActivityCalculated') {
                                    console.log('Found ActivityCalculated event!', parsedEvent);
                                    
                                    const args = (parsedEvent as any).args;
                                    const wallets = args.wallets || args[0] || [];
                                    const activityPoints = args.activityPoints || args[1] || [];
                                    
                                    console.log(`Event data - Wallets: ${wallets.length}, Points: ${activityPoints.length}`);
                                    
                                    if (wallets.length > 0 || activityPoints.length > 0) {
                                        console.log(`Successfully found ActivityCalculated event with ${wallets.length} wallets`);
                                        return { wallets, activityPoints };
                                    } else {
                                        console.log('ActivityCalculated event found but with empty data');
                                    }
                                }
                            }
                        } catch (parseError) {
                            // Skip events that can't be parsed
                            continue;
                        }
                    }
                }
                
                if (attempt < maxAttempts - 1) {
                    console.log(`No ActivityCalculated results yet, waiting ${delayMs}ms before next attempt...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                } else {
                    console.log('This was the final polling attempt');
                }
            } catch (error) {
                console.warn(`Polling attempt ${attempt + 1} failed:`, error);
                if (attempt < maxAttempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }
        
        console.log(`No ActivityCalculated results found after ${maxAttempts} attempts`);
        return null;
    }

    /**
     * Sends an activity request to the smart contract.
     * @param {GetActivityParams} params - The parameters for the activity request.
     * @returns {Promise<Transaction>} The transaction details.
     * @throws Will throw an error if contract address, slot ID, version, or subscription ID is not set.
     */
    async getActivity(params: GetActivityParams): Promise<Transaction> {
        const chainName = GetActivityConfig.CHAIN_NAME;
        const contractAddress: `0x${string}` = GetActivityConfig.GET_ACTIVITY_CONTRACT_ADDRESS as `0x${string}`;
        const donHostedSecretsSlotID: number = GetActivityConfig.DON_HOSTED_SECRETS_SLOT_ID;
        const donHostedSecretsVersion: number = GetActivityConfig.DON_HOSTED_SECRETS_VERSION;
        const clSubId: number = GetActivityConfig.CHAINLINK_SUBSCRIPTION_ID;

        if (contractAddress === "0x00" || donHostedSecretsSlotID === Infinity || donHostedSecretsVersion === Infinity || clSubId === Infinity) {
            throw new Error("Contract address, slot ID, version, or subscription ID is not set. Please update GetActivityConfig.");
        }

        console.log(
            `Get activity for Twitter handle: ${params.twitterHandle}`
        );

        this.walletProvider.switchChain("sepolia");

        const walletClient = this.walletProvider.getWalletClient("sepolia");

        try {
            const abi = getActivityJson; // The ABI is directly the array
            const getActivityContract = getContract({
                address: contractAddress,
                abi,
                client: walletClient
            });

            const args: string[] = [params.twitterHandle];

            const hash = await getActivityContract.write.sendRequest([
                donHostedSecretsSlotID,
                donHostedSecretsVersion,
                args,
                clSubId
            ]);

            // Wait for transaction to be mined using public client
            const publicClient = this.walletProvider.getPublicClient("sepolia");
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            
            // Parse events from the transaction receipt
            let activityResults: { wallets: string[]; activityPoints: bigint[] } | null = null;
            
            if (receipt.logs && receipt.logs.length > 0) {
                try {
                    // Parse all logs to find ActivityCalculated event using the parseEventLogs function
                    const events = parseEventLogs({
                        abi,
                        logs: receipt.logs
                        // Note: removed eventName filter to get all events first
                    });

                    console.log("All parsed events:", events);

                    // Find ActivityCalculated events
                    const activityEvents = events.filter((event: any) => 
                        event.eventName === 'ActivityCalculated'
                    );

                    // Check if we found any ActivityCalculated events
                    if (activityEvents.length > 0) {
                        const activityEvent = activityEvents[0]; // Get the first event
                        console.log("Found ActivityCalculated event:", activityEvent);
                        
                        // Try different ways to access the event data
                        let wallets: string[] = [];
                        let activityPoints: bigint[] = [];
                        
                        // Method 1: Direct args access
                        if ((activityEvent as any).args) {
                            const args = (activityEvent as any).args;
                            wallets = args.wallets || args[0] || [];
                            activityPoints = args.activityPoints || args[1] || [];
                        }
                        // Method 2: Check if data is at root level
                        else if ((activityEvent as any).wallets) {
                            wallets = (activityEvent as any).wallets || [];
                            activityPoints = (activityEvent as any).activityPoints || [];
                        }
                        
                        if (wallets.length > 0 || activityPoints.length > 0) {
                            activityResults = {
                                wallets: wallets,
                                activityPoints: activityPoints
                            };
                            console.log("Activity results found:", {
                                walletsCount: wallets.length,
                                pointsCount: activityPoints.length,
                                wallets: wallets,
                                points: activityPoints.map(p => p.toString())
                            });
                        } else {
                            console.log("Event found but no wallet/points data extracted");
                        }
                    } else {
                        console.log("No ActivityCalculated events found in transaction logs");
                        console.log("Available events:", events.map((e: any) => e.eventName || 'unknown'));
                    }
                } catch (error) {
                    console.warn("Could not parse events:", error);
                }
            }

            // If no immediate results from events, try polling for stored results
            if (!activityResults) {
                console.log("No immediate results, polling for ActivityCalculated events...");
                const polledResults = await this.pollForResults(
                    params.twitterHandle, 
                    hash, 
                    GetActivityConfig.POLLING_MAX_ATTEMPTS, 
                    GetActivityConfig.POLLING_DELAY_MS
                );
                if (polledResults) {
                    activityResults = polledResults;
                }
            }

            return {
                hash,
                from: walletClient.account!.address,
                to: contractAddress,
                value: parseEther("0"),
                data: "0x",
                activityResults, // Include the parsed results
            };
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Function call failed: ${error.message}`);
            } else {
                throw new Error(`Function call failed: unknown error`);
            }
        }
    }
}

/**
 * Builds the function call details required for the getActivity action.
 * @param {State} state - The current state.
 * @param {IAgentRuntime} runtime - The agent runtime.
 * @param {WalletProvider} wp - The wallet provider.
 * @returns {Promise<GetActivityParams>} The parameters for the activity request.
 */
const buildFunctionCallDetails = async (
    state: State,
    runtime: IAgentRuntime,
    wp: WalletProvider
): Promise<GetActivityParams> => {
    const chains = Object.keys(wp.chains);
    state.supportedChains = chains.map((item) => `"${item}"`).join("|");

    const context = composeContext({
        state,
        template: getActivityTemplate,
    });

    const functionCallDetails = (await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
    })) as GetActivityParams;

    return functionCallDetails;
};

/**
 * The getActivityAction handler.
 * @type {Action}
 */
export const getActivityAction: Action = {
    name: "GET_ACTIVITY",
    description: "Get activity points for a Twitter handle. Triggers when user mentions activity points, Twitter handles, or asks to check/get/show activity data for a Twitter user.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        _options?: any,
        callback?: HandlerCallback
    ) => {
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        console.log("Get activity action handler called");
        const walletProvider = await initWalletProvider(runtime);
        const action = new GetActivityAction(walletProvider);

        // Compose functionCall context
        const activityParams: GetActivityParams = await buildFunctionCallDetails(
            state,
            runtime,
            walletProvider
        );

        try {
            const callFunctionResp = await action.getActivity(activityParams);
            
            // Format the response based on whether we got activity results
            let responseText = `Successfully requested activity data for Twitter handle: ${activityParams.twitterHandle}\nTransaction Hash: ${callFunctionResp.hash}`;
            let responseContent: any = {
                success: true,
                hash: callFunctionResp.hash,
                twitterHandle: activityParams.twitterHandle,
                chain: GetActivityConfig.CHAIN_NAME,
            };

            if (callFunctionResp.activityResults) {
                // We got the activity results directly from the transaction
                const { wallets, activityPoints } = callFunctionResp.activityResults;
                
                responseText += `\n\n🎯 Activity Results:\n`;
                if (wallets.length === 0) {
                    responseText += `No wallet addresses found for Twitter handle @${activityParams.twitterHandle}`;
                } else {
                    responseText += `Found ${wallets.length} wallet address(es) for @${activityParams.twitterHandle}:\n\n`;
                    for (let i = 0; i < wallets.length; i++) {
                        const points = activityPoints[i] ? activityPoints[i].toString() : "0";
                        responseText += `🔸 Wallet: ${wallets[i]}\n   Activity Points: ${points}\n\n`;
                    }
                }
                
                responseContent.activityResults = {
                    wallets: wallets,
                    activityPoints: activityPoints.map(p => p.toString()),
                    totalWallets: wallets.length
                };
            } else {
                // No immediate results, need to wait for the event
                responseText += `\n\nThe smart contract is processing your request. Please wait for the ActivityCalculated event to get the wallet addresses and activity points.`;
                responseContent.note = "Listen for ActivityCalculated event to get wallet addresses and activity points";
            }

            if (callback) {
                callback({
                    text: responseText,
                    content: responseContent,
                });
            }
            return true;
        } catch (error) {
            console.error("Error during get activity call:", error);
            if (error instanceof Error) {
                if (callback) {
                    callback({
                        text: `Error getting activity data: ${error.message}`,
                        content: { error: error.message },
                    });
                }
            } else {
                console.error("unknown error");
            }
            return false;
        }
    },
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "I'll help you get activity data for a Twitter handle",
                    action: "ACTIVITY_POINTS",
                },
            },
            {
                user: "user",
                content: {
                    text: "Get activity for Twitter handle @johnsmith",
                    action: "ACTIVITY_POINTS",
                },
            },
            {
                user: "user",
                content: {
                    text: "Can you check the activity points for Twitter user @cryptouser123?",
                    action: "ACTIVITY_POINTS",
                },
            },
            {
                user: "user",
                content: {
                    text: "give me activity points for twitter handle ShivRai518940",
                    action: "ACTIVITY_POINTS",
                },
            },
            {
                user: "user",
                content: {
                    text: "show me activity points for ShivRai518940",
                    action: "ACTIVITY_POINTS",
                },
            },
            {
                user: "user",
                content: {
                    text: "show activity points for @username123",
                    action: "ACTIVITY_POINTS",
                },
            },
        ],
    ],
    similes: [
        "ACTIVITY_POINTS",
        "GET_ACTIVITY", 
        "ACTIVITY_CHECK", 
        "TWITTER_ACTIVITY", 
        "CHECK_POINTS",
        "GIVE_ACTIVITY",
        "SHOW_ACTIVITY",
        "GET_POINTS",
        "TWITTER_POINTS",
        "POINTS_FOR_TWITTER",
        "ACTIVITY_FOR_TWITTER",
        "get activity points",
        "give me activity points",
        "show activity points",
        "check activity",
        "twitter activity",
        "activity data",
        "twitter points",
        "get points",
        "activity lookup",
        "activity points for twitter handle",
        "give me activity points for twitter handle",
        "twitter handle"
    ],
};
