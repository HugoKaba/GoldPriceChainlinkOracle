'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useContractRead, useWalletClient, usePublicClient } from 'wagmi';
import { tokenABI as ABI } from './tokenABI';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACT_ADDRESS, COLLATERAL_ADDRESS, NFT_CONTRACT_ADDRESS } from './constants';

// Minimal ERC20 ABI for approve/allowance/decimals
const ERC20_ABI = [
	{
		constant: true,
		inputs: [],
		name: 'decimals',
		outputs: [{ name: '', type: 'uint8' }],
		type: 'function',
	},
	{
		constant: true,
		inputs: [
			{ name: 'owner', type: 'address' },
			{ name: 'spender', type: 'address' },
		],
		name: 'allowance',
		outputs: [{ name: '', type: 'uint256' }],
		type: 'function',
	},
	{
		constant: false,
		inputs: [
			{ name: 'spender', type: 'address' },
			{ name: 'amount', type: 'uint256' },
		],
		name: 'approve',
		outputs: [{ name: '', type: 'bool' }],
		type: 'function',
	},
	{
		constant: true,
		inputs: [{ name: 'account', type: 'address' }],
		name: 'balanceOf',
		outputs: [{ name: '', type: 'uint256' }],
		type: 'function',
	},
];

function formatBigInt(n: any) {
	try {
		return n?.toString();
	} catch {
		return String(n);
	}
}

export default function ContractUI() {
	const { address } = useAccount();
	const walletClient = useWalletClient();
	const publicClient = usePublicClient();
	const [smallRequiredCollateral, setSmallRequiredCollateral] = useState<boolean>(false);

	function friendlyError(e: any) {
		// Simple classifier for common wallet/viem errors
		const msg = String(e?.message ?? e ?? 'Unknown error');
		if (/user rejected|User rejected|User denied transaction/i.test(msg)) {
			return 'Transaction rejected in wallet (you cancelled the signature).';
		}
		if (/insufficient funds/i.test(msg)) {
			return 'Insufficient funds to pay gas or amount. Check your wallet balance.';
		}
		if (/replacement transaction underpriced|nonce too low/i.test(msg)) {
			return 'Transaction failed due to nonce/gas; try again or increase gas.';
		}
		// Fallback: concise message (don't expose long raw hex blobs)
		return msg.split('\n')[0].slice(0, 200);
	}
	const [mintAmount, setMintAmount] = useState('');
	const [redeemAmount, setRedeemAmount] = useState('');
	const [txHash, setTxHash] = useState<string | null>(null);
	const [balance, setBalance] = useState<string>('0');
	const [priceInfo, setPriceInfo] = useState<{ price: string; updatedAt: string } | null>(null);
	const [txPending, setTxPending] = useState(false);
	const [priceLoading, setPriceLoading] = useState(false);
	const [requiredCollateral, setRequiredCollateral] = useState<string | null>(null);
	const [requiredCollateralRaw, setRequiredCollateralRaw] = useState<any>(null);
	const [collateralDecimals, setCollateralDecimals] = useState<number>(6);
	const [feeGOF, setFeeGOF] = useState<string | null>(null);
	const [netMintGOF, setNetMintGOF] = useState<string | null>(null);
	const [allowance, setAllowance] = useState<string>('0');
	const [allowanceRaw, setAllowanceRaw] = useState<any>(null);

	// NFT states
	const [nftMintPrice, setNftMintPrice] = useState<any>(null);
	const [nftPaymentToken, setNftPaymentToken] = useState<string | null>(null);
	const [nftPaymentDecimals, setNftPaymentDecimals] = useState<number>(18);
	const [nftAllowance, setNftAllowance] = useState<string>('0');
	const [nftAllowanceRaw, setNftAllowanceRaw] = useState<any>(null);
	const [nftTokenURI, setNftTokenURI] = useState<string>('');
	const [nftMessage, setNftMessage] = useState<string | null>(null);
	const [nftError, setNftError] = useState<string | null>(null);
	const [nftTxPending, setNftTxPending] = useState<boolean>(false);
	const [checkingCollateral, setCheckingCollateral] = useState(false);
	const [mintMessage, setMintMessage] = useState<string | null>(null);
	const [mintError, setMintError] = useState<string | null>(null);

	// Read gold price via hook
	const { data: goldPriceData } = useContractRead({
		address: CONTRACT_ADDRESS as `0x${string}`,
		abi: ABI as any,
		functionName: 'getGoldPrice',
	});

	// Read contract params
	const { data: collateralRatioData } = useContractRead({
		address: CONTRACT_ADDRESS as `0x${string}`,
		abi: ABI as any,
		functionName: 'collateralRatioPct',
	});
	const { data: mintFeeData } = useContractRead({
		address: CONTRACT_ADDRESS as `0x${string}`,
		abi: ABI as any,
		functionName: 'mintFeeBps',
	});
	const { data: redeemFeeData } = useContractRead({
		address: CONTRACT_ADDRESS as `0x${string}`,
		abi: ABI as any,
		functionName: 'redeemFeeBps',
	});
	const { data: ownerData } = useContractRead({
		address: CONTRACT_ADDRESS as `0x${string}`,
		abi: ABI as any,
		functionName: 'owner',
	});

	// Read user's GOF balance via hook (call refetch manually)
	const { data: balanceData } = useContractRead({
		address: CONTRACT_ADDRESS as `0x${string}`,
		abi: ABI as any,
		functionName: 'balanceOf',
		args: [address ?? '0x0000000000000000000000000000000000000000'],
	});

	useEffect(() => {
		if (goldPriceData) {
			const g: any = goldPriceData;
			try {
				const formatted = formatUnits(g[0] as any, 18);
				const updated = Number(g[1])
					? new Date(Number(g[1]) * 1000).toLocaleString()
					: String(g[1]);
				setPriceInfo({ price: formatted, updatedAt: updated });
			} catch (e) {
				setPriceInfo({ price: String(g[0]), updatedAt: String(g[1]) });
			}
		}
	}, [goldPriceData]);

	useEffect(() => {
		if (balanceData) {
			try {
				const formatted = formatUnits(balanceData as any, 18);
				setBalance(formatted);
			} catch (e) {
				setBalance(String(balanceData as any));
			}
		}
	}, [balanceData]);

	// helper to refresh price and balance manually or after tx
	async function refreshData() {
		try {
			setPriceLoading(true);
			// read gold price
			if (!publicClient) return;
			const gp: any = await publicClient.readContract({
				address: CONTRACT_ADDRESS as `0x${string}`,
				abi: ABI as any,
				functionName: 'getGoldPrice',
				args: [],
			});
			try {
				const formatted = formatUnits(gp[0] as any, 18);
				const updated = Number(gp[1])
					? new Date(Number(gp[1]) * 1000).toLocaleString()
					: String(gp[1]);
				setPriceInfo({ price: formatted, updatedAt: updated });
			} catch (e) {
				setPriceInfo({ price: String(gp[0]), updatedAt: String(gp[1]) });
			}

			// read balance if connected
			if (address) {
				const b: any = await publicClient.readContract({
					address: CONTRACT_ADDRESS as `0x${string}`,
					abi: ABI as any,
					functionName: 'balanceOf',
					args: [address as `0x${string}`],
				});
				try {
					setBalance(formatUnits(b as any, 18));
				} catch (e) {
					setBalance(String(b));
				}
			}
		} catch (e) {
			console.error('refresh failed', e);
		} finally {
			setPriceLoading(false);
		}
	}

	// get collateral decimals and allowance
	useEffect(() => {
		async function loadCollateralInfo() {
			if (!publicClient) return;
			try {
				// decimals
				const d: any = await publicClient.readContract({
					address: COLLATERAL_ADDRESS as `0x${string}`,
					abi: ERC20_ABI as any,
					functionName: 'decimals',
					args: [],
				});
				setCollateralDecimals(Number(d));
				// allowance if connected
				if (address) {
					const al: any = await publicClient.readContract({
						address: COLLATERAL_ADDRESS as `0x${string}`,
						abi: ERC20_ABI as any,
						functionName: 'allowance',
						args: [address as `0x${string}`, CONTRACT_ADDRESS as `0x${string}`],
					});
					try {
						setAllowance(formatUnits(al as any, Number(d)));
						setAllowanceRaw(al as any);
					} catch {
						setAllowance(String(al));
						setAllowanceRaw(al as any);
					}
				}
			} catch (e) {
				console.error('collateral info failed', e);
			}
		}
		loadCollateralInfo();
	}, [publicClient, address]);

	async function checkRequiredCollateral() {
		if (!mintAmount) return;
		if (!publicClient) return;
		setCheckingCollateral(true);
		try {
			const amountGOF = parseUnits(mintAmount, 18);
			const req: any = await publicClient.readContract({
				address: CONTRACT_ADDRESS as `0x${string}`,
				abi: ABI as any,
				functionName: 'requiredCollateralForMint',
				args: [amountGOF],
			});
			setRequiredCollateralRaw(req);
			try {
				const human = formatUnits(req as any, collateralDecimals);
				setRequiredCollateral(human);
				// detect if the required collateral is non-zero but formats to 0 due to decimals
				try {
					const asBig = BigInt(req as any);
					if (asBig > BigInt(0) && parseFloat(human) === 0) {
						setSmallRequiredCollateral(true);
					} else {
						setSmallRequiredCollateral(false);
					}
				} catch (e) {
					setSmallRequiredCollateral(false);
				}
			} catch {
				setRequiredCollateral(String(req));
			}

			// compute fee (in GOF) and net minted GOF after fee
			try {
				const bps = Number(mintFeeData ?? 0);
				const BPS_DENOM = 10000;
				const feeRaw = (BigInt(amountGOF as any) * BigInt(bps)) / BigInt(BPS_DENOM);
				const netRaw = BigInt(amountGOF as any) - feeRaw;
				setFeeGOF(formatUnits(feeRaw as any, 18));
				setNetMintGOF(formatUnits(netRaw as any, 18));
			} catch (e) {
				setFeeGOF(null);
				setNetMintGOF(null);
			}
			// update allowance if connected
			if (address) {
				const al: any = await publicClient.readContract({
					address: COLLATERAL_ADDRESS as `0x${string}`,
					abi: ERC20_ABI as any,
					functionName: 'allowance',
					args: [address as `0x${string}`, CONTRACT_ADDRESS as `0x${string}`],
				});
				try {
					setAllowance(formatUnits(al as any, collateralDecimals));
					setAllowanceRaw(al as any);
				} catch {
					setAllowance(String(al));
					setAllowanceRaw(al as any);
				}
			}
		} catch (e) {
			console.error('required collateral failed', e);
		} finally {
			setCheckingCollateral(false);
		}
	}

	async function approveCollateral() {
		if (!walletClient || !requiredCollateralRaw) return;
		setNftMessage(null);
		setNftError(null);
		setMintMessage(null);
		setMintError(null);
		try {
			setTxPending(true);
			const tx = await walletClient?.data?.writeContract({
				address: COLLATERAL_ADDRESS as `0x${string}`,
				abi: ERC20_ABI as any,
				functionName: 'approve',
				// approve exactly the required collateral (contract will transfer this amount)
				args: [CONTRACT_ADDRESS as `0x${string}`, requiredCollateralRaw],
			});
			setTxHash(String(tx));
			// wait for receipt
			if (tx && publicClient) {
				let receipt: any = null;
				while (!receipt) {
					await new Promise((r) => setTimeout(r, 1000));
					try {
						receipt = await publicClient.getTransactionReceipt({
							hash: String(tx) as `0x${string}`,
						});
					} catch {}
				}
				// refresh allowance
				const al: any = await publicClient.readContract({
					address: COLLATERAL_ADDRESS as `0x${string}`,
					abi: ERC20_ABI as any,
					functionName: 'allowance',
					args: [address as `0x${string}`, CONTRACT_ADDRESS as `0x${string}`],
				});
				try {
					setAllowance(formatUnits(al as any, collateralDecimals));
					setAllowanceRaw(al as any);
				} catch {
					setAllowance(String(al));
					setAllowanceRaw(al as any);
				}
				setMintMessage('Approve transaction mined — you can now Mint');
			}
		} catch (e) {
			console.error('approve failed', e);
			setMintError(friendlyError(e));
		} finally {
			setTxPending(false);
		}
	}

	// Handlers using walletClient.writeContract (viem-compatible)
	async function handleMint() {
		if (!mintAmount) return;
		setNftMessage(null);
		setNftError(null);
		setMintMessage(null);
		setMintError(null);
		if (smallRequiredCollateral) {
			setMintError(
				'Required collateral is smaller than one unit of the collateral token. Increase mint amount.',
			);
			return;
		}
		try {
			// parseUnits allows users to enter human-friendly token amounts (e.g. "100")
			const amount = parseUnits(mintAmount, 18);
			setTxPending(true);
			const hash = await walletClient?.data?.writeContract({
				address: CONTRACT_ADDRESS as `0x${string}`,
				abi: ABI as any,
				functionName: 'mintWithCollateral',
				args: [amount],
			});
			setTxHash(String(hash));

			// wait for receipt (poll)
			if (hash && publicClient) {
				let receipt: any = null;
				try {
					// some providers expose wait, but poll here for compatibility
					receipt = await publicClient.getTransactionReceipt({
						hash: String(hash) as `0x${string}`,
					});
				} catch (e) {
					// ignore
				}
				while (!receipt) {
					await new Promise((r) => setTimeout(r, 1000));
					try {
						receipt = await publicClient.getTransactionReceipt({
							hash: String(hash) as `0x${string}`,
						});
					} catch (e) {
						// ignore
					}
				}
				// refresh on mined
				await refreshData();
				setMintMessage('Mint successful — GOF credited to your address');
			}
		} catch (e: any) {
			console.error('mint failed', e);
			setTxHash(null);
			setMintError(friendlyError(e));
		}
		setTxPending(false);
	}

	// ---------------- NFT: load info, approve GOF (or payment token), mint NFT
	useEffect(() => {
		async function loadNFTInfo() {
			if (!publicClient || !NFT_CONTRACT_ADDRESS) return;
			try {
				const mp: any = await publicClient.readContract({
					address: NFT_CONTRACT_ADDRESS as `0x${string}`,
					abi: [
						{
							name: 'mintPrice',
							type: 'function',
							stateMutability: 'view',
							outputs: [{ type: 'uint256' }],
							inputs: [],
						},
						{
							name: 'paymentToken',
							type: 'function',
							stateMutability: 'view',
							outputs: [{ type: 'address' }],
							inputs: [],
						},
					],
					functionName: 'mintPrice',
					args: [],
				});
				// mintPrice read above; now paymentToken
				const pt: any = await publicClient.readContract({
					address: NFT_CONTRACT_ADDRESS as `0x${string}`,
					abi: [
						{
							name: 'paymentToken',
							type: 'function',
							stateMutability: 'view',
							outputs: [{ type: 'address' }],
							inputs: [],
						},
					],
					functionName: 'paymentToken',
					args: [],
				});
				setNftMintPrice(mp as any);
				setNftPaymentToken(String(pt).toLowerCase());
				// read decimals of payment token
				try {
					const dec: any = await publicClient.readContract({
						address: String(pt) as `0x${string}`,
						abi: ERC20_ABI as any,
						functionName: 'decimals',
						args: [],
					});
					setNftPaymentDecimals(Number(dec));
				} catch (e) {
					setNftPaymentDecimals(18);
				}
				// allowance if connected
				if (address) {
					const al: any = await publicClient.readContract({
						address: String(pt) as `0x${string}`,
						abi: ERC20_ABI as any,
						functionName: 'allowance',
						args: [address as `0x${string}`, NFT_CONTRACT_ADDRESS as `0x${string}`],
					});
					try {
						setNftAllowance(formatUnits(al as any, Number(nftPaymentDecimals)));
						setNftAllowanceRaw(al as any);
					} catch {
						setNftAllowance(String(al));
						setNftAllowanceRaw(al as any);
					}
				}
			} catch (e) {
				console.error('load NFT info failed', e);
			}
		}
		loadNFTInfo();
	}, [publicClient, NFT_CONTRACT_ADDRESS, address]);

	async function approveNFTPayment() {
		if (!walletClient || !nftMintPrice || !nftPaymentToken) return;
		setNftError(null);
		setNftMessage(null);
		try {
			setNftTxPending(true);
			const tx = await walletClient?.data?.writeContract({
				address: nftPaymentToken as `0x${string}`,
				abi: ERC20_ABI as any,
				functionName: 'approve',
				args: [NFT_CONTRACT_ADDRESS as `0x${string}`, nftMintPrice],
			});
			setTxHash(String(tx));
			if (tx && publicClient) {
				let receipt: any = null;
				while (!receipt) {
					await new Promise((r) => setTimeout(r, 1000));
					try {
						receipt = await publicClient.getTransactionReceipt({
							hash: String(tx) as `0x${string}`,
						});
					} catch {}
				}
				// refresh nft allowance
				const al: any = await publicClient.readContract({
					address: nftPaymentToken as `0x${string}`,
					abi: ERC20_ABI as any,
					functionName: 'allowance',
					args: [address as `0x${string}`, NFT_CONTRACT_ADDRESS as `0x${string}`],
				});
				try {
					setNftAllowance(formatUnits(al as any, nftPaymentDecimals));
					setNftAllowanceRaw(al as any);
				} catch {
					setNftAllowance(String(al));
					setNftAllowanceRaw(al as any);
				}
			}
		} catch (e: any) {
			console.error('approve nft payment failed', e);
			setNftError(friendlyError(e));
		} finally {
			setNftTxPending(false);
		}
	}

	async function handleNFTMint() {
		if (!walletClient || !nftMintPrice || !NFT_CONTRACT_ADDRESS) return;
		setNftError(null);
		setNftMessage(null);
		if (!nftTokenURI || nftTokenURI.trim().length === 0) {
			setNftError('Please enter a tokenURI (ipfs://... or metadata URL)');
			return;
		}
		try {
			setNftTxPending(true);
			const tx = await walletClient?.data?.writeContract({
				address: NFT_CONTRACT_ADDRESS as `0x${string}`,
				abi: [
					{
						name: 'mint',
						type: 'function',
						stateMutability: 'nonpayable',
						inputs: [{ name: 'uri', type: 'string' }],
						outputs: [],
					},
				],
				functionName: 'mint',
				args: [nftTokenURI],
			});
			setTxHash(String(tx));
			if (tx && publicClient) {
				let receipt: any = null;
				while (!receipt) {
					await new Promise((r) => setTimeout(r, 1000));
					try {
						receipt = await publicClient.getTransactionReceipt({
							hash: String(tx) as `0x${string}`,
						});
					} catch {}
				}
				setNftMessage('NFT minted successfully — check your wallet/collection');
				// refresh nft allowance/info
				if (nftPaymentToken && address) {
					const al: any = await publicClient.readContract({
						address: nftPaymentToken as `0x${string}`,
						abi: ERC20_ABI as any,
						functionName: 'allowance',
						args: [address as `0x${string}`, NFT_CONTRACT_ADDRESS as `0x${string}`],
					});
					try {
						setNftAllowance(formatUnits(al as any, nftPaymentDecimals));
						setNftAllowanceRaw(al as any);
					} catch {
						setNftAllowance(String(al));
						setNftAllowanceRaw(al as any);
					}
				}
			}
		} catch (e: any) {
			console.error('nft mint failed', e);
			setNftError(friendlyError(e));
		}
		setNftTxPending(false);
	}

	async function handleRedeem() {
		if (!redeemAmount) return;
		try {
			const amount = parseUnits(redeemAmount, 18);
			setTxPending(true);
			const hash = await walletClient?.data?.writeContract({
				address: CONTRACT_ADDRESS as `0x${string}`,
				abi: ABI as any,
				functionName: 'redeem',
				args: [amount],
			});
			setTxHash(String(hash));

			if (hash && publicClient) {
				let receipt: any = null;
				try {
					receipt = await publicClient.getTransactionReceipt({
						hash: String(hash) as `0x${string}`,
					});
				} catch (e) {}
				while (!receipt) {
					await new Promise((r) => setTimeout(r, 1000));
					try {
						receipt = await publicClient.getTransactionReceipt({
							hash: String(hash) as `0x${string}`,
						});
					} catch (e) {}
				}
				await refreshData();
			}
		} catch (e: any) {
			console.error('redeem failed', e);
			setTxHash(null);
		}
		setTxPending(false);
	}

	return (
		<section className="w-full max-w-3xl rounded-2xl p-8 bg-gradient-to-br from-[#0f172a] to-[#001219] text-white shadow-2xl glassmorphism">
			<h2 className="text-2xl font-bold mb-4 neon">Gold Stable (GOF) — Interface</h2>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="p-4 rounded-lg bg-black/30">
					<p className="text-sm text-zinc-300">Connected address</p>
					<p className="truncate font-mono mt-2">{address ?? 'Not connected'}</p>
					<p className="text-sm text-zinc-300 mt-3">GOF balance</p>
					<p className="font-mono">{balance}</p>
					<div className="mt-3 grid grid-cols-2 gap-2">
						<div className="text-xs text-zinc-400">Status</div>
						<div className="text-xs">
							{ownerData &&
							address &&
							String(ownerData).toLowerCase() === String(address).toLowerCase()
								? 'Owner'
								: 'Active'}
						</div>
						<div className="text-xs text-zinc-400">Network</div>
						<div className="text-xs">{process.env.NEXT_PUBLIC_NETWORK ?? 'unknown'}</div>
					</div>
				</div>

				<div className="p-4 rounded-lg bg-black/30">
					<p className="text-sm text-zinc-300">Gold price (18dp)</p>
					<p className="font-mono">{priceInfo ? priceInfo.price : '—'}</p>
					<p className="text-xs text-zinc-400 mt-1">
						updatedAt: {priceInfo ? priceInfo.updatedAt : '—'}
					</p>
				</div>
			</div>

			<div className="mt-6 grid gap-4 md:grid-cols-2">
				<div className="p-4 rounded-lg bg-black/20">
					<label className="text-sm">Mint GOF (amount GOF)</label>
					<input
						value={mintAmount}
						onChange={(e) => setMintAmount(e.target.value)}
						placeholder="e.g. 100"
						className="w-full mt-2 p-2 rounded bg-black/40"
					/>
					<div className="mt-3">
						<div className="flex gap-2">
							<button
								onClick={checkRequiredCollateral}
								className="px-3 py-2 rounded bg-yellow-500 text-black font-semibold"
							>
								Check required collateral
							</button>
							{/* Replace approve button with conditional Approve -> Mint flow */}
							{requiredCollateralRaw ? (
								// If required collateral is effectively < 1 unit of token, tell user to increase amount
								smallRequiredCollateral ? (
									<button className="px-3 py-2 rounded bg-gray-700 text-white" disabled>
										Required collateral &lt; 1 unit - increase mint amount
									</button>
								) : // compare raw allowance and requiredCollateralRaw
								BigInt(allowanceRaw ?? 0) >= BigInt(requiredCollateralRaw ?? 0) ? (
									<button
										onClick={handleMint}
										disabled={txPending}
										className="px-3 py-2 rounded bg-emerald-500 text-black font-semibold"
									>
										Mint (use approved collateral)
									</button>
								) : (
									<button
										onClick={approveCollateral}
										disabled={txPending}
										className="px-3 py-2 rounded bg-orange-500 text-black font-semibold"
									>
										Approve required collateral (USDC)
									</button>
								)
							) : (
								<button
									onClick={() => setRequiredCollateral('')}
									className="px-3 py-2 rounded bg-gray-700 text-white"
								>
									Enter an amount and click &quot;Check required collateral&quot;
								</button>
							)}
						</div>

						<div className="mt-6 grid gap-4 md:grid-cols-3">
							<div className="p-4 rounded-lg bg-black/20">
								<p className="text-xs text-zinc-400">Collateral Ratio</p>
								<p className="font-semibold">
									{collateralRatioData ? String(collateralRatioData) + '%' : '—'}
								</p>
							</div>
							<div className="p-4 rounded-lg bg-black/20">
								<p className="text-xs text-zinc-400">Stability Fee (mint)</p>
								<p className="font-semibold">
									{mintFeeData ? (Number(mintFeeData) / 100).toFixed(2) + '%' : '—'}
								</p>
							</div>
							<div className="p-4 rounded-lg bg-black/20">
								<p className="text-xs text-zinc-400">Stability Fee (redeem)</p>
								<p className="font-semibold">
									{redeemFeeData ? (Number(redeemFeeData) / 100).toFixed(2) + '%' : '—'}
								</p>
							</div>
						</div>
						<div className="mt-3">
							<div className="text-xs text-zinc-400">Required Collateral</div>
							<div className="font-mono">
								{checkingCollateral ? 'checking...' : requiredCollateral ?? '—'}
							</div>
							<div className="text-xs text-zinc-400 mt-2">Allowance: {allowance}</div>
							<div className="mt-2">
								{feeGOF && netMintGOF && (
									<div className="mb-2 text-sm text-zinc-300">
										<div>
											Fee (GOF): <span className="font-mono">{feeGOF}</span>
										</div>
										<div>
											You'll receive (GOF): <span className="font-mono">{netMintGOF}</span>
										</div>
									</div>
								)}
								{/* Informational area: Mint button is shown next to Check/Approve when allowance is sufficient */}
								<div className="mt-2">
									{mintMessage && <div className="text-sm text-emerald-400">{mintMessage}</div>}
									{mintError && <div className="text-sm text-rose-400">{mintError}</div>}
									<div className="text-xs text-zinc-400 mt-2">
										The Mint action appears above the &quot;Check required collateral&quot; button
										once you've approved the required USDC amount.
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="p-4 rounded-lg bg-black/20">
					<label className="text-sm">Redeem GOF (amount GOF)</label>
					<input
						value={redeemAmount}
						onChange={(e) => setRedeemAmount(e.target.value)}
						placeholder="e.g. 50"
						className="w-full mt-2 p-2 rounded bg-black/40"
					/>
					<div className="mt-3 flex gap-2">
						<button
							onClick={handleRedeem}
							className="px-4 py-2 rounded bg-rose-500 text-black font-semibold"
						>
							Redeem
						</button>
					</div>
				</div>
			</div>

			<div className="mt-6 text-sm text-zinc-300">
				<p>Last tx: {txHash ?? '—'}</p>
			</div>
		</section>
	);
}
