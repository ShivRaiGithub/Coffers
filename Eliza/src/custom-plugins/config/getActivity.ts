/**
 * Configuration for GetActivity contract integration
 * Update these values with your actual deployment details
 */

export const GetActivityConfig = {
    // Contract addresses
    GET_ACTIVITY_CONTRACT_ADDRESS: "0xB63465e2731488E2569Ff565822Fc1d93D12D37D", // Update after deploying GetActivity.sol
    MAIN_CONTRACT_ADDRESS: "0x32116049E79985D6eF2D8819478D7939A0a38F2e", // Your Main contract address
    
    // Chainlink Functions configuration
    DON_HOSTED_SECRETS_SLOT_ID: 0, // Update with your slot ID
    DON_HOSTED_SECRETS_VERSION: , // Update with your version
    CHAINLINK_SUBSCRIPTION_ID: , // Update with your subscription ID
    
    // Network configuration
    CHAIN_NAME: "sepolia",
    
    // Polling configuration for ActivityCalculated events
    POLLING_MAX_ATTEMPTS: 20,
    POLLING_DELAY_MS: 5000,
    POLLING_BLOCK_LOOKBACK: 100,
    
    // Supabase configuration (used in the smart contract JavaScript)
    SUPABASE_PROJECT_URL: "", // Your Supabase project URL
    SUPABASE_TABLE_NAME: "user_wallets",
    SUPABASE_COLUMNS: "twitter_handle,wallet_address"
};

export default GetActivityConfig;
