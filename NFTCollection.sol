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
 * @dev NFT Collection mintable by paying with ERC20 tokens (GOF)
 * Metadata stored on IPFS
 */
contract NFTCollectionERC20 is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    IERC20 public paymentToken;
    uint256 public mintPrice;
    uint256 public maxSupply;
    string private _baseTokenURI;
    bool public mintingPaused;
    uint256 public maxMintsPerAddress;
    mapping(address => uint256) public mintedByAddress;

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

    function mint(string memory uri) external nonReentrant {
        require(!mintingPaused, "Minting paused");
        require(_tokenIdCounter.current() < maxSupply, "Max supply reached");
        if (maxMintsPerAddress > 0) {
            require(
                mintedByAddress[msg.sender] < maxMintsPerAddress,
                "Mint limit per address reached"
            );
        }
        require(paymentToken.transferFrom(msg.sender, address(this), mintPrice), "Payment failed");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        mintedByAddress[msg.sender]++;
        emit NFTMinted(msg.sender, tokenId, uri);
    }

    function batchMint(string[] memory tokenURIs) external nonReentrant {
        uint256 count = tokenURIs.length;
        require(!mintingPaused, "Minting paused");
        require(count > 0, "No tokenURIs provided");
        require(_tokenIdCounter.current() + count <= maxSupply, "Max supply exceeded");

        if (maxMintsPerAddress > 0) {
            require(
                mintedByAddress[msg.sender] + count <= maxMintsPerAddress,
                "Mint limit per address reached"
            );
        }
        uint256 totalCost = mintPrice * count;
        require(paymentToken.transferFrom(msg.sender, address(this), totalCost), "Batch payment failed");

        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(msg.sender, tokenId);
            _setTokenURI(tokenId, tokenURIs[i]);
            emit NFTMinted(msg.sender, tokenId, tokenURIs[i]);
        }
        mintedByAddress[msg.sender] += count;
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        uint256 oldPrice = mintPrice;
        mintPrice = newPrice;
        emit MintPriceUpdated(oldPrice, newPrice);
    }

    function setPaymentToken(address newPaymentToken) external onlyOwner {
        require(newPaymentToken != address(0), "Invalid token address");
        address oldToken = address(paymentToken);
        paymentToken = IERC20(newPaymentToken);
        emit PaymentTokenUpdated(oldToken, newPaymentToken);
    }

    function setBaseURI(string memory baseTokenURI) external onlyOwner {
        _baseTokenURI = baseTokenURI;
        emit BaseURIUpdated(baseTokenURI);
    }

    function toggleMintingPause() external onlyOwner {
        mintingPaused = !mintingPaused;
        emit MintingPausedToggled(mintingPaused);
    }

    function withdrawTokens(address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        uint256 balance = paymentToken.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");
        require(paymentToken.transfer(to, balance), "Withdrawal failed");
        emit FundsWithdrawn(address(paymentToken), to, balance);
    }

    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function remainingSupply() external view returns (uint256) {
        return maxSupply - _tokenIdCounter.current();
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

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
