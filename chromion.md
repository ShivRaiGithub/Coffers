# The Problem it solves
## Describe what can people use it for, or how it makes existing tasks easier/safer e.t.c (markdown supported)


### RWAs

1) Tokenizing Real World Assets : Allows users to easily tokenize their asset into NFTs using an image of the asset along with a proof of ownership image.

2) Easy Trade : Easy trade between users for buying and selling of assets.

3) Seamless way of getting loans by putting the assets tokens up as collateral.

### Twitter integration

4) Integration of twitter login creates a mapping of user wallet to twitter handle allowing others to securely verify someone's twitter to wallet address or vice versa.

5) Eliza OS agent allows real time fetching of user wallets and activity points of each wallet by their twitter handle on twitter.

6) This integration creates a hybrid mode where users can interact on twitter and make transactions on-chain.


### Chainlink

7) Chainlink data feeds : Providing users with real time conversion of ETH to USD.

8) Chainlink automation : Used to call a Liquidation function to liquidate all liquidatable loans once per day (+00 UTC)

9) Chainlink functions : Used to implement ElizaOS Agent.




# Challenges I ran into
## Tell us about any specific bug or hurdle you ran into while building this project. how did you get over it? (markdown supported)

1) Setting Up ElizaOS agent for the required functionality: It was difficult to setup my own Eliza agent. I had to go through few of the files and play around to know what to do. The tutorial certainly was helpful.

2) Setting up GetActivity.sol. It was difficult to setup the contract for the wallet parsing and fetching. I had to make a proper flow of incoming and outgoing data and also had to write some test files and functions.

3) Setting up Twitter login along with supabase. For some reason, it took quite a bit of time and I later realized I would have to use ngrok since my website isnt deployed yet and some other changes.



# Hackathon Tracks

## Onchain Finance

### RWAs
Coffers allows users to easily and seamlessly tokenize their assets along with a proof of ownership of that asset for validity. 
Users can then easily buy or sell assets.
### DeFi
Users are also able to put their tokenized assets up as collateral for a loan for a limited time period (certain number of days asked for by the borrower).
Borrowers have to repay the loan (along with 10% interest of the amount asked) within the time period else lenders can liquidate the loan making them the new owner of the contract and borrowers losing their ownership.


## ElizaOS - DeFi & Web3 Agent

ElizaOs is being used along with twitter in order to easily provide a way for users to get the list of wallets of a user through their twitter handle along with getting the activity points of each wallet. Since activity points are an indication of how much a wallet has interacted with the contract, this feature allows users to build trust for another user and more willing to perform trade or grant loan.

