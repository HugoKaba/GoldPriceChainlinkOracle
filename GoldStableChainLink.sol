// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
 * GoldStableChainlink.sol (Student Exercise)
 * ERC20 stable token pegged to 1oz of gold (XAU/USD).
 * Oracle: Chainlink Price Feed (XAU/USD)
 * Collateral: ERC20 (e.g. USDC)
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function decimals() external view returns (uint8);
}

contract GoldStableChainlink is ERC20, Ownable, ReentrancyGuard {
    IERC20 public collateral;
    AggregatorV3Interface public priceFeed;

    uint16 public collateralRatioPct = 120;  // 120%
    uint16 public mintFeeBps = 50;           // 0.5%
    uint16 public redeemFeeBps = 50;         // 0.5%
    uint256 public constant BPS_DENOM = 10000;

    event Minted(address indexed user, uint256 amountGOF, uint256 collateralDeposited);
    event Redeemed(address indexed user, uint256 amountGOF, uint256 collateralReturned);
    event OracleUpdated(address oldFeed, address newFeed);

    constructor(address _collateral, address _priceFeed)
        ERC20("Gold Stable (Chainlink)", "GOF")
        Ownable(msg.sender)
    {
        collateral = IERC20(_collateral);
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    /// @notice Get gold price from Chainlink, normalized to 18 decimals
    function getGoldPrice() public view returns (uint256 price18, uint256 updatedAt) {
        (
            , 
            int256 answer,
            ,
            uint256 timeStamp,
            
        ) = priceFeed.latestRoundData();

        require(answer > 0, "invalid oracle answer");

        uint8 oracleDecimals = priceFeed.decimals();
        // Normalize price to 18 decimals
        if (oracleDecimals < 18) {
            price18 = uint256(answer) * (10 ** (18 - oracleDecimals));
        } else {
            price18 = uint256(answer) / (10 ** (oracleDecimals - 18));
        }

        updatedAt = timeStamp;
    }

    /// @notice Calculate how much collateral is needed to mint `amountGOF`
    function requiredCollateralForMint(uint256 amountGOF)
        public
        view
        returns (uint256 requiredCollateral)
    {
        (uint256 goldPrice, ) = getGoldPrice();

        // USD value of amountGOF in 18 decimals
        uint256 usdValue = (amountGOF * goldPrice) / 1e18;

        // Apply collateral ratio (e.g. 120%)
        uint256 adjusted = (usdValue * collateralRatioPct) / 100;

        // Adjust to collateral decimals
        uint8 colDec = ERC20(address(collateral)).decimals();
        if (colDec < 18) {
            requiredCollateral = adjusted / (10 ** (18 - colDec));
        } else {
            requiredCollateral = adjusted * (10 ** (colDec - 18));
        }
    }

    /// @notice Mint GOF by depositing collateral
    function mintWithCollateral(uint256 amountGOF) external nonReentrant {
        require(amountGOF > 0, "zero amount");

        uint256 required = requiredCollateralForMint(amountGOF);

        // Transfer collateral
        require(
            collateral.transferFrom(msg.sender, address(this), required),
            "collateral transfer failed"
        );

        // Apply mint fee
        uint256 fee = (amountGOF * mintFeeBps) / BPS_DENOM;
        uint256 mintAmountAfterFee = amountGOF - fee;

        // Mint GOF
        _mint(msg.sender, mintAmountAfterFee);

        emit Minted(msg.sender, mintAmountAfterFee, required);
    }

    /// @notice Redeem GOF for collateral
    function redeem(uint256 amountGOF) external nonReentrant {
        require(amountGOF > 0, "zero amount");
        require(balanceOf(msg.sender) >= amountGOF, "insufficient GOF");

        (uint256 goldPrice, ) = getGoldPrice();
        uint8 colDec = ERC20(address(collateral)).decimals();

        // USD value of GOF being redeemed
        uint256 usdValue = (amountGOF * goldPrice) / 1e18;

        // Convert to collateral decimals
        uint256 collateralAmount;
        if (colDec < 18) {
            collateralAmount = usdValue / (10 ** (18 - colDec));
        } else {
            collateralAmount = usdValue * (10 ** (colDec - 18));
        }

        // Apply redemption fee
        uint256 fee = (collateralAmount * redeemFeeBps) / BPS_DENOM;
        uint256 redeemAmount = collateralAmount - fee;

        // Burn GOF and send collateral
        _burn(msg.sender, amountGOF);
        require(collateral.transfer(msg.sender, redeemAmount), "collateral transfer failed");

        emit Redeemed(msg.sender, amountGOF, redeemAmount);
    }

    // ADMIN FUNCTIONS
    function setPriceFeed(address newFeed) external onlyOwner {
        address old = address(priceFeed);
        priceFeed = AggregatorV3Interface(newFeed);
        emit OracleUpdated(old, newFeed);
    }

    function setCollateralRatio(uint16 newPct) external onlyOwner {
        require(newPct >= 100, "ratio < 100%");
        collateralRatioPct = newPct;
    }

    function setFees(uint16 _mintFeeBps, uint16 _redeemFeeBps) external onlyOwner {
        require(_mintFeeBps <= 1000 && _redeemFeeBps <= 1000, "fees too high");
        mintFeeBps = _mintFeeBps;
        redeemFeeBps = _redeemFeeBps;
    }

    function emergencyWithdrawCollateral(address to, uint256 amount) external onlyOwner {
        require(collateral.transfer(to, amount), "withdraw failed");
    }
}