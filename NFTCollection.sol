// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title NFTCollectionERC20
 * @dev NFT Collection mintable by paying with ERC20 tokens
 * Metadata stored on IPFS
 * 
 * STUDENT EXERCISE: Complete the TODOs to implement a functional NFT marketplace
 */
contract NFTCollectionERC20 is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // Counter to track token IDs
    Counters.Counter private _tokenIdCounter;
    
    // ERC20 token used for payment
    IERC20 public paymentToken;
    
    // Price per NFT in ERC20 tokens (with decimals)
    uint256 public mintPrice;
    
    // Maximum supply of NFTs
    uint256 public maxSupply;
    
    // Base URI for IPFS metadata
    string private _baseTokenURI;
    
    // Toggle for pausing minting
    bool public mintingPaused;
    
    // Max mints per address (0 = unlimited)
    uint256 public maxMintsPerAddress;
    
    // Track mints per address
    mapping(address => uint256) public mintedByAddress;
    
    // Events
    event NFTMinted(address indexed minter, uint256 indexed tokenId, string tokenURI);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event PaymentTokenUpdated(address indexed oldToken, address indexed newToken);
    event BaseURIUpdated(string newBaseURI);
    event MintingPausedToggled(bool isPaused);
    event FundsWithdrawn(address indexed token, address indexed to, uint256 amount);
    
    constructor(
        string memory name,
        string memory symbol,
        address _paymentToken,
        uint256 _mintPrice,
        uint256 _maxSupply,
        string memory baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_maxSupply > 0, "Max supply must be > 0");
        
        paymentToken = IERC20(_paymentToken);
        mintPrice = _mintPrice;
        maxSupply = _maxSupply;
        _baseTokenURI = baseTokenURI;
        mintingPaused = false;
        maxMintsPerAddress = 0; // Unlimited by default
    }
    
    /**
     * @dev Mint a new NFT by paying with ERC20 tokens
     * @param tokenURI The IPFS URI for the token metadata (e.g., "QmHash...")
     * 
     * TODO: Implement the mint function
     * HINTS:
     * 1. Check if minting is not paused
     * 2. Check if max supply has not been reached
     * 3. Check if user hasn't exceeded max mints per address (if set)
     * 4. Transfer ERC20 tokens from minter to this contract using transferFrom
     * 5. Get current token ID and increment counter
     * 6. Mint the NFT to msg.sender using _safeMint
     * 7. Set the token URI using _setTokenURI
     * 8. Update mintedByAddress mapping
     * 9. Emit NFTMinted event
     */
    function mint(string memory tokenURI) external nonReentrant {
        // TODO: Add your implementation here
        
    }
    
    /**
     * @dev Batch mint multiple NFTs
     * @param tokenURIs Array of IPFS URIs for token metadata
     * 
     * TODO: Implement batch minting
     * HINTS:
     * 1. Check minting is not paused and array is not empty
     * 2. Check that minting all tokens won't exceed max supply
     * 3. Check max mints per address limit
     * 4. Calculate total cost (mintPrice * array length)
     * 5. Transfer total ERC20 tokens from minter
     * 6. Loop through tokenURIs array and mint each NFT
     * 7. Update mintedByAddress mapping
     * 8. Emit NFTMinted event for each token
     */
    function batchMint(string[] memory tokenURIs) external nonReentrant {
        // TODO: Add your implementation here
        
    }
    
    /**
     * @dev Owner can mint NFTs for free (for giveaways, team, etc.)
     * @param to Address to mint to
     * @param tokenURI IPFS URI for the token metadata
     */
    function ownerMint(address to, string memory tokenURI) external onlyOwner {
        require(_tokenIdCounter.current() < maxSupply, "Max supply reached");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit NFTMinted(to, tokenId, tokenURI);
    }
    
    /**
     * @dev Update the mint price
     * @param newPrice New price in ERC20 tokens
     * 
     * TODO: Implement price update function
     * HINTS:
     * 1. Store old price in a variable
     * 2. Update mintPrice to newPrice
     * 3. Emit MintPriceUpdated event with old and new prices
     */
    function setMintPrice(uint256 newPrice) external onlyOwner {
        // TODO: Add your implementation here
        
    }
    
    /**
     * @dev Update the payment token
     * @param newPaymentToken Address of new ERC20 payment token
     * 
     * TODO: Implement payment token update
     * HINTS:
     * 1. Require newPaymentToken is not address(0)
     * 2. Store old token address
     * 3. Update paymentToken to new IERC20 instance
     * 4. Emit PaymentTokenUpdated event
     */
    function setPaymentToken(address newPaymentToken) external onlyOwner {
        // TODO: Add your implementation here
        
    }
    
    /**
     * @dev Set base URI for IPFS metadata
     * @param baseTokenURI New base URI (e.g., "ipfs://")
     */
    function setBaseURI(string memory baseTokenURI) external onlyOwner {
        _baseTokenURI = baseTokenURI;
        
        emit BaseURIUpdated(baseTokenURI);
    }
    
    /**
     * @dev Toggle minting pause state
     * 
     * TODO: Implement pause toggle
     * HINTS:
     * 1. Toggle mintingPaused boolean (flip true/false)
     * 2. Emit MintingPausedToggled event with new state
     */
    function toggleMintingPause() external onlyOwner {
        // TODO: Add your implementation here
        
    }
    
    /**
     * @dev Set maximum mints per address
     * @param max Maximum number of mints (0 = unlimited)
     */
    function setMaxMintsPerAddress(uint256 max) external onlyOwner {
        maxMintsPerAddress = max;
    }
    
    /**
     * @dev Withdraw accumulated ERC20 tokens
     * @param to Address to send tokens to
     * 
     * TODO: Implement token withdrawal
     * HINTS:
     * 1. Require 'to' address is not address(0)
     * 2. Get balance of paymentToken held by this contract
     * 3. Require balance is greater than 0
     * 4. Transfer tokens to 'to' address
     * 5. Emit FundsWithdrawn event
     */
    function withdrawTokens(address to) external onlyOwner {
        // TODO: Add your implementation here
        
    }
    
    /**
     * @dev Get total number of minted NFTs
     */
    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter.current();
    }
    
    /**
     * @dev Get remaining supply
     * 
     * TODO: Calculate and return remaining supply
     * HINT: Subtract current counter from maxSupply
     */
    function remainingSupply() external view returns (uint256) {
        // TODO: Add your implementation here
        
    }
    
    /**
     * @dev Override base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Required overrides for multiple inheritance
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}