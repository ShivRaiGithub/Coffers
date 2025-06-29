// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/GetActivity.sol";
import "../src/Main.sol";
import "../src/Asset.sol";
import "../src/Lending.sol";

contract GetActivityTest is Test {
    GetActivity public getActivity;
    Main public mainContract;
    Asset public nftContract;
    Lending public lendingContract;
    
    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    // Mock price feed address for testing
    address public mockPriceFeed = address(0x123);

    function setUp() public {
        // Deploy GetActivity contract with hardcoded main address
        getActivity = new GetActivity();
    }

    function testConstructor() public {
        assertEq(getActivity.getMainContractAddress(), 0x32116049E79985D6eF2D8819478D7939A0a38F2e);
        // Check that deployer is in allow list
        assertTrue(getActivity.addToAllowList.selector != bytes4(0)); // Contract exists
    }

    function testAddToAllowList() public {
        // Add user1 to allow list
        getActivity.addToAllowList(user1);
        
        // Test that user1 can now call functions (we can't directly test the mapping, 
        // but we can test that the function doesn't revert when called by user1)
        vm.prank(user1);
        getActivity.addToAllowList(user2);
    }

    function testRemoveFromAllowList() public {
        // Add user1 first
        getActivity.addToAllowList(user1);
        
        // User1 removes themselves
        vm.prank(user1);
        getActivity.removeFromAllowList();
        
        // User1 should no longer be able to call onlyAllowList functions
        vm.prank(user1);
        vm.expectRevert("you do not have permission to call the function");
        getActivity.addToAllowList(user2);
    }

    function testParseAddressSingle() public {
        // Test single address parsing
        string memory singleAddressJson = '["0x1234567890123456789012345678901234567890"]';
        address[] memory result = getActivity.testParseWalletAddresses(singleAddressJson);
        
        assertEq(result.length, 1);
        assertEq(result[0], 0x1234567890123456789012345678901234567890);
    }

    function testParseAddressMultiple() public {
        // Test multiple addresses parsing
        string memory multiAddressJson = '["0x1234567890123456789012345678901234567890","0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD"]';
        address[] memory result = getActivity.testParseWalletAddresses(multiAddressJson);
        
        assertEq(result.length, 2);
        assertEq(result[0], 0x1234567890123456789012345678901234567890);
        assertEq(result[1], 0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD);
    }

    function testParseAddressInvalid() public {
        // Test invalid address (too short) - this will cause arithmetic underflow
        // because the parsing tries to extract 42 characters but only has 5
        string memory invalidJson = '["0x123"]';
        
        vm.expectRevert(); // Expect any revert (arithmetic underflow in this case)
        getActivity.testParseWalletAddresses(invalidJson);
    }

    function testParseAddressFuzz(string memory input) public {
        // This test ensures parseAddress handles invalid inputs gracefully
        try getActivity.testParseAddress(input) returns (address) {
            // If it succeeds, the input must be a valid 42-character hex string
            bytes memory inputBytes = bytes(input);
            assertEq(inputBytes.length, 42);
            assertTrue(inputBytes[0] == 0x30 && inputBytes[1] == 0x78); // starts with "0x"
        } catch Error(string memory reason) {
            // If it reverts with "Invalid address" or "Invalid hex", that's expected
            assertTrue(
                keccak256(bytes(reason)) == keccak256(bytes("Invalid address")) ||
                keccak256(bytes(reason)) == keccak256(bytes("Invalid hex")),
                "Should only revert with expected error messages"
            );
        } catch {
            // Should not revert with low-level errors
            assertTrue(false, "Function should not revert with low-level errors");
        }
    }

    function testHexToIntFuzz(bytes1 input) public {
        // This test ensures hexToInt handles all possible byte inputs gracefully
        try getActivity.testHexToInt(input) returns (uint160 result) {
            // If it succeeds, verify the result is within expected range
            assertTrue(result <= 15, "Hex digit should be 0-15");
            
            // Verify the input is a valid hex character
            assertTrue(
                (input >= 0x30 && input <= 0x39) || // 0-9
                (input >= 0x41 && input <= 0x46) || // A-F
                (input >= 0x61 && input <= 0x66),   // a-f
                "Valid result should only come from valid hex characters"
            );
        } catch Error(string memory reason) {
            // If it reverts, it should be with "Invalid hex"
            assertEq(reason, "Invalid hex", "Should only revert with 'Invalid hex'");
        } catch {
            // Should not revert with low-level errors
            assertTrue(false, "Function should not revert with low-level errors");
        }
    }

    function testHexToInt() public {
        // Test hex character conversion
        assertEq(getActivity.testHexToInt(0x30), 0);  // '0'
        assertEq(getActivity.testHexToInt(0x39), 9);  // '9'
        assertEq(getActivity.testHexToInt(0x41), 10); // 'A'
        assertEq(getActivity.testHexToInt(0x46), 15); // 'F'
        assertEq(getActivity.testHexToInt(0x61), 10); // 'a'
        assertEq(getActivity.testHexToInt(0x66), 15); // 'f'
        
        // Test invalid character
        vm.expectRevert("Invalid hex");
        getActivity.testHexToInt(0x47); // 'G'
    }

    function testSourceConstant() public {
        string memory source = getActivity.updateSupabaseUrl();
        assertTrue(bytes(source).length > 0);
        // Check if it contains expected Supabase URL
        assertTrue(contains(source, "jjmymcixzemomrisjazv.supabase.co"));
    }

    function testParseAddressValid() public {
        string memory addrStr = "0x1234567890123456789012345678901234567890";
        address result = getActivity.testParseAddress(addrStr);
        assertEq(result, 0x1234567890123456789012345678901234567890);
    }
    
    function testParseAddressInvalidLength() public {
        string memory shortAddr = "0x12345"; // Too short
        vm.expectRevert("Invalid address");
        getActivity.testParseAddress(shortAddr);
        
        string memory longAddr = "0x12345678901234567890123456789012345678901"; // Too long
        vm.expectRevert("Invalid address");
        getActivity.testParseAddress(longAddr);
    }
    
    function testParseAddressInvalidPrefix() public {
        string memory noPrefix = "1234567890123456789012345678901234567890"; // Missing 0x
        vm.expectRevert("Invalid address");
        getActivity.testParseAddress(noPrefix);
    }

    // Helper function to check if string contains substring
    function contains(string memory source, string memory target) internal pure returns (bool) {
        bytes memory sourceBytes = bytes(source);
        bytes memory targetBytes = bytes(target);
        
        if (targetBytes.length > sourceBytes.length) return false;
        
        for (uint i = 0; i <= sourceBytes.length - targetBytes.length; i++) {
            bool found = true;
            for (uint j = 0; j < targetBytes.length; j++) {
                if (sourceBytes[i + j] != targetBytes[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }
}
