// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import "./Main.sol";

/**
 * GetActivity Contract - Chainlink Functions Integration
 * 
 * Flow:
 * 1. A Twitter handle is passed to sendRequest()
 * 2. Chainlink Functions queries Supabase to get wallet addresses for that handle
 * 3. For each wallet address, activity points are calculated from Main contract
 * 4. Both arrays (wallets and activity points) are returned via ActivityCalculated event
 * 
 * Simplified version - users only need to provide a Twitter handle.
 * A single Twitter handle can be associated with multiple wallet addresses.
 * No data is stored on-chain - everything is returned via events for the agent to process.
 * 
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract GetActivity is FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;

    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;
    string public result;
    mapping(address => bool) private allowList;

    Main public immutable mainContract;

    error UnexpectedRequestID(bytes32 requestId);

    event Response(bytes32 indexed requestId, bytes response, bytes err);
    event ActivityCalculated(address[] wallets, uint256[] activityPoints);

    // Hardcode for Ethereum Sepolia testnet
    address public constant ROUTER_ADDR = 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0;
    bytes32 public constant DON_ID = 0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000;
    uint32 public constant CALLBACK_GAS_LIMIT = 300_000;

    // JavaScript code to fetch wallet addresses for a Twitter handle from Supabase
    // REPLACE THE SUPABASE PROJECT NAME in js code below:
    // "url: `https://<SUPABASE_PROJECT_NAME>.supabase.co/rest/v1/<TABLE_NAME>?select=<COLUMN_NAME1>,<COLUMN_NAME2>`,"
    // TABLE_NAME should be "user_wallets"
    // COLUMN_NAMES should be "twitter_handle,wallet_address"
    string public constant SOURCE =
        "const twitterHandle = args[0];"
        'if(!secrets.apikey) { throw Error("Error: Supabase API Key is not set!") };'
        "const apikey = secrets.apikey;"
        "const apiResponse = await Functions.makeHttpRequest({"
        'url: "https://jjmymcixzemomrisjazv.supabase.co/rest/v1/user_wallets?select=twitter_handle,wallet_address",'
        'method: "GET",'
        'headers: { "apikey": apikey}'
        "});"
        "if (apiResponse.error) {"
        "console.error(apiResponse.error);"
        'throw Error("Request failed: " + apiResponse.message);'
        "};"
        "const { data } = apiResponse;"
        "const userWallets = data.filter(item => item.twitter_handle === twitterHandle);"
        'if(userWallets.length === 0) {return Functions.encodeString("not found")};'
        "const walletAddresses = userWallets.map(item => item.wallet_address);"
        "return Functions.encodeString(JSON.stringify(walletAddresses));";

    constructor() FunctionsClient(ROUTER_ADDR) {
        allowList[msg.sender] = true;
        mainContract = Main(0x32116049E79985D6eF2D8819478D7939A0a38F2e);
    }

    function sendRequest(
        uint8 donHostedSecretsSlotID,
        uint64 donHostedSecretsVersion,
        string[] memory args,
        uint64 subscriptionId
    ) external onlyAllowList returns (bytes32 requestId) {
        // Send the Chainlink Functions request with DON hosted secret
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(SOURCE);
        if (donHostedSecretsVersion > 0)
            req.addDONHostedSecrets(
                donHostedSecretsSlotID,
                donHostedSecretsVersion
            );
        if (args.length > 0) req.setArgs(args);
        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            CALLBACK_GAS_LIMIT,
            DON_ID
        );

        return s_lastRequestId;
    }

    /**
     * @notice Process response and calculate activity points
     * @param requestId The request ID, returned by sendRequest()
     * @param response Aggregated response from the user code
     * @param err Aggregated error from the user code or from the execution pipeline
     * Either response or error parameter will be set, but never both
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }
        s_lastResponse = response;
        s_lastError = err;

        emit Response(requestId, s_lastResponse, s_lastError);

        // Check if wallets were found
        if (keccak256(response) == keccak256(bytes("not found"))) return;

        // If no error, process the wallet addresses and calculate activity points
        if (err.length == 0) {
            string memory responseStr = string(response);
            
            // Parse the JSON response to get wallet addresses
            address[] memory wallets = _parseWalletAddresses(responseStr);
            uint256[] memory activityPoints = new uint256[](wallets.length);
            
            // Calculate activity points for each wallet
            for (uint256 i = 0; i < wallets.length; i++) {
                uint256 points = mainContract.getUserActivityPoints(wallets[i]);
                activityPoints[i] = points;
            }
            
            // Emit the results (arrays of wallets and their activity points)
            emit ActivityCalculated(wallets, activityPoints);
        }
    }

    /**
     * @notice Parse wallet addresses from JSON string
     * @dev This is a simplified parser for the specific JSON format
     * @param jsonStr JSON string containing wallet addresses
     * @return wallets Array of wallet addresses
     */
   /**
 * @notice Parse wallet addresses from JSON string
 * @dev Simple parser for JSON array format: ["0x123...", "0x456..."]
 * @param jsonStr JSON string containing wallet addresses
 * @return wallets Array of wallet addresses
 */
function _parseWalletAddresses(string memory jsonStr) internal pure returns (address[] memory) {
    bytes memory jsonBytes = bytes(jsonStr);
    
    // Count how many "0x" occurrences (= number of addresses)
    uint256 addressCount = 0;
    for (uint256 i = 0; i < jsonBytes.length - 1; i++) {
        if (jsonBytes[i] == 0x30 && jsonBytes[i + 1] == 0x78) { // "0x"
            addressCount++;
        }
    }
    
    if (addressCount == 0) {
        return new address[](0);
    }
    
    address[] memory wallets = new address[](addressCount);
    uint256 walletIndex = 0;
    
    // Extract all addresses
    for (uint256 i = 0; i < jsonBytes.length - 41; i++) {
        if (jsonBytes[i] == 0x30 && jsonBytes[i + 1] == 0x78) { // "0x"
            // Extract 42 characters (0x + 40 hex chars)
            bytes memory addrBytes = new bytes(42);
            for (uint256 j = 0; j < 42; j++) {
                addrBytes[j] = jsonBytes[i + j];
            }
            
            wallets[walletIndex] = _parseAddress(string(addrBytes));
            walletIndex++;
        }
    }
    
    return wallets;
}

function _parseAddress(string memory addrStr) internal pure returns (address) {
    bytes memory addrBytes = bytes(addrStr);
    require(addrBytes.length == 42, "Invalid address");
    
    uint160 addressResult = 0;
    for (uint256 i = 2; i < 42; i++) {
        addressResult = addressResult * 16 + _hexToInt(addrBytes[i]);
    }
    
    return address(addressResult);
}

function _hexToInt(bytes1 char) internal pure returns (uint160) {
    if (char >= 0x30 && char <= 0x39) return uint160(uint8(char)) - 48; // 0-9
    if (char >= 0x41 && char <= 0x46) return uint160(uint8(char)) - 55; // A-F
    if (char >= 0x61 && char <= 0x66) return uint160(uint8(char)) - 87; // a-f
    revert("Invalid hex");
}

    /**
     * @notice Add address to allow list
     * @param addrToAdd Address to add to allow list
     */
    function addToAllowList(address addrToAdd) external onlyAllowList {
        allowList[addrToAdd] = true;
    }

    /**
     * @notice Remove sender from allow list
     */
    function removeFromAllowList() external onlyAllowList {
        allowList[msg.sender] = false;
    }

    /**
     * @notice Update the Supabase URL in the SOURCE code (for testing)
     * @dev This would require updating the SOURCE constant in a real deployment
     */
    function updateSupabaseUrl() external pure returns (string memory) {
        // Return the current SOURCE for reference
        return SOURCE;
    }

    /**
     * @notice Get the Main contract address
     * @return Address of the Main contract
     */
    function getMainContractAddress() external view returns (address) {
        return address(mainContract);
    }

    // ========== TEST HELPER FUNCTIONS ==========
    // These functions are only for testing the internal logic
    
    function testParseWalletAddresses(string memory jsonStr) external pure returns (address[] memory) {
        return _parseWalletAddresses(jsonStr);
    }
    
    function testParseAddress(string memory addrStr) external pure returns (address) {
        return _parseAddress(addrStr);
    }
    
    function testHexToInt(bytes1 char) external pure returns (uint160) {
        return _hexToInt(char);
    }

    modifier onlyAllowList() {
        require(
            allowList[msg.sender],
            "you do not have permission to call the function"
        );
        _;
    }
}
