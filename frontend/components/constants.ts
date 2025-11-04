// All contract addresses and keys must be provided via environment variables.
// These variables should be set in a `.env.local` file at the project root
// (or via your deployment platform). They are intentionally NOT hard-coded.
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
export const COLLATERAL_ADDRESS = process.env.NEXT_PUBLIC_COLLATERAL_ADDRESS || '';
export const PRICEFEED_ADDRESS = process.env.NEXT_PUBLIC_PRICEFEED_ADDRESS || '';
