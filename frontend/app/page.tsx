'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
// ConnectButton moved to global header in layout
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { tokenABI } from '@/components/tokenABI';
import { TOKEN_CONTRACT_ADDRESS, COLLATERAL_TOKEN_CONTRACT_ADDRESS } from '@/components/constants';
import { erc20Abi } from 'viem';
import NFTCollection from '@/components/NFTCollection';

export default function Home() {
	const { address, isConnected } = useAccount();
	const [mintAmount, setMintAmount] = useState('0.01');
	const [balance, setBalance] = useState<string | null>(null);
	const [loadingBalance, setLoadingBalance] = useState(false);
	const [approved, setApproved] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const amount = parseUnits(mintAmount, 18);

	// ----- Approve Collateral -----
	const { writeContract: approveContract, data: approveHash } = useWriteContract();
	const { isLoading: approving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
		hash: approveHash,
	});

	const handleApprove = async () => {
		if (!isConnected) return alert('Connect your wallet first');
		setErrorMessage(null);
		try {
			approveContract({
				address: COLLATERAL_TOKEN_CONTRACT_ADDRESS as `0x${string}`,
				abi: erc20Abi,
				functionName: 'approve',
				args: [TOKEN_CONTRACT_ADDRESS as `0x${string}`, amount],
			});
		} catch (error) {
			console.error('Approval error:', error);
			setErrorMessage('Approval failed. Please try again.');
		}
	};

	// ----- Mint with Collateral -----
	const { writeContract: mintContract, data: mintHash, isPending, isError } = useWriteContract();
	const { isLoading: txLoading, isSuccess: mintSuccess } = useWaitForTransactionReceipt({
		hash: mintHash,
	});

	const handleMint = async () => {
		if (!isConnected) return alert('Connect your wallet first');
		setErrorMessage(null);
		try {
			mintContract({
				address: TOKEN_CONTRACT_ADDRESS as `0x${string}`,
				abi: tokenABI,
				functionName: 'mintWithCollateral',
				args: [amount],
			});
		} catch (contractError) {
			console.error('Minting error:', contractError);
			setErrorMessage('Minting failed. Please try again.');
		}
	};

	// ----- Read: allowance -----
	const { refetch: refetchAllowance, data: allowanceData } = useReadContract({
		address: COLLATERAL_TOKEN_CONTRACT_ADDRESS as `0x${string}`,
		abi: erc20Abi,
		functionName: 'allowance',
		args: [address as `0x${string}`, TOKEN_CONTRACT_ADDRESS as `0x${string}`],
		query: { enabled: false },
	});

	const fetchAllowance = useCallback(async () => {
		if (!address) return;
		try {
			const { data } = await refetchAllowance();
			// Check if allowance is sufficient - if so, no need to approve again
			const hasEnoughAllowance = data !== undefined && data !== null && BigInt(data) >= amount;
			setApproved(hasEnoughAllowance);
		} catch (err) {
			console.error(err);
			setApproved(false);
		}
	}, [address, amount, refetchAllowance]);

	useEffect(() => {
		if (isConnected) fetchAllowance();
	}, [isConnected, address, fetchAllowance, approveSuccess, mintSuccess]);

	// ----- Read: balanceOf -----
	const { refetch: refetchBalance } = useReadContract({
		address: TOKEN_CONTRACT_ADDRESS as `0x${string}`,
		abi: tokenABI,
		functionName: 'balanceOf',
		args: [address as `0x${string}`],
		query: { enabled: false },
	});

	const fetchBalance = useCallback(async () => {
		if (!address) return;
		setLoadingBalance(true);
		try {
			const { data } = await refetchBalance();
			setBalance(data ? data.toString() : '0');
		} catch (err) {
			console.error(err);
			setBalance('0');
		} finally {
			setLoadingBalance(false);
		}
	}, [address, refetchBalance]);

	useEffect(() => {
		if (isConnected) fetchBalance();
	}, [isConnected, address, fetchBalance]);

	useEffect(() => {
		if (mintSuccess) fetchBalance();
	}, [mintSuccess, fetchBalance]);

	return (
		<div className="relative min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-zinc-950 dark:via-amber-950/20 dark:to-zinc-900 overflow-hidden">
			{/* Animated background elements */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
				<div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl animate-pulse delay-700"></div>
				<div className="absolute top-1/2 left-1/2 w-80 h-80 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
			</div>

			<div className="relative flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
				<main className="spartan-container">
					{/* Header */}
					<div className="text-center mb-8 space-y-4 spartan-hero">
						<div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-2xl shadow-yellow-500/50 mb-4 transform hover:scale-110 transition-transform duration-300">
							<span className="text-4xl">✨</span>
						</div>
						<h1 className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 via-amber-500 to-orange-600 dark:from-yellow-400 dark:via-amber-300 dark:to-orange-400 tracking-tight">
							Spart Stable Token
						</h1>
						<p className="text-xl text-amber-800 dark:text-amber-200 font-medium">
							Premium collateralized stablecoin backed by real-world value
						</p>
					</div>

					{/* Header ConnectButton now displayed site-wide in the header */}

					{isConnected && (
						<div className="dashboard-grid animate-in fade-in duration-500">
							{/* Left Column - Balance Dashboard */}
							<div>
								<div className="dashboard-card">
									<div className="dashboard-inner">
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'space-between',
											}}
										>
											<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
												<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg">
													💰
												</div>
												<div>
													<h3 className="card-title">Your Balance</h3>
													<div className="balance-label">Spart Token Balance</div>
												</div>
											</div>
										</div>

										<div style={{ marginTop: 14 }}>
											{loadingBalance ? (
												<div className="muted">Loading balance...</div>
											) : (
												<div>
													<div className="balance-figure">{balance ?? '0'}</div>
													<div className="balance-label">SPART</div>
												</div>
											)}
										</div>

										<div className="stat-row">
											<div className="stat-badge">
												<div className="stat-title">Collateral Ratio</div>
												<div className="stat-value">150%</div>
											</div>
											<div className="stat-badge">
												<div className="stat-title">Stability Fee</div>
												<div className="stat-value">0.5%</div>
											</div>
											<div className="stat-badge">
												<div className="stat-title">Network</div>
												<div className="stat-value">Ethereum</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Right Column - Mint Card */}
							<div className="space-y-6">
								<div className="group relative dashboard-card mint-panel">
									<div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

									<div className="relative">
										<div className="flex items-center gap-3 mb-6">
											<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
												<span className="text-2xl">⚡</span>
											</div>
											<h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
												Mint Tokens
											</h2>
										</div>

										<div className="space-y-4">
											<div className="spartan-field">
												<label className="spartan-label">Amount to Mint</label>
												<div className="spartan-form-row" style={{ alignItems: 'center' }}>
													<input
														type="text"
														value={mintAmount}
														onChange={(e) => setMintAmount(e.target.value)}
														className="spartan-input"
														placeholder="0.00"
													/>
													<div
														style={{ minWidth: 56, textAlign: 'center', fontWeight: 800 }}
														className="muted"
													>
														SPART
													</div>
												</div>
											</div>

											<div className="spartan-card" style={{ padding: '0.75rem' }}>
												<div className="flex justify-between spartan-helper">
													<span>Required Collateral</span>
													<strong>{mintAmount}</strong>
												</div>
												<div
													className="flex justify-between spartan-helper"
													style={{ marginTop: 6 }}
												>
													<span>You'll Receive</span>
													<strong>{mintAmount} SPART</strong>
												</div>
											</div>

											<div className="spartan-form-row">
												{!approved ? (
													<button
														onClick={handleApprove}
														disabled={approving}
														className={`spartan-btn ${approving ? 'ghost' : 'primary'} w-full`}
													>
														{approving ? 'Approving...' : 'Approve Collateral'}
													</button>
												) : (
													<button
														onClick={handleMint}
														disabled={isPending || txLoading}
														className={`spartan-btn primary w-full`}
													>
														{isPending
															? 'Confirm in Wallet...'
															: txLoading
															? 'Minting...'
															: '🚀 Mint Tokens'}
													</button>
												)}
											</div>

											{mintSuccess && (
												<div className="bg-green-100 dark:bg-green-900/30 border-2 border-green-500 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
													<div className="flex items-center gap-3">
														<span className="text-2xl">✅</span>
														<div>
															<p className="font-bold text-green-800 dark:text-green-300">
																Mint Successful!
															</p>
															<p className="text-sm text-green-700 dark:text-green-400">
																Your tokens have been minted
															</p>
														</div>
													</div>
												</div>
											)}

											{errorMessage && (
												<div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
													<div className="flex items-start gap-3">
														<span className="text-2xl">❌</span>
														<div className="flex-1">
															<p className="font-bold text-red-800 dark:text-red-300">
																Transaction Failed
															</p>
															<p className="text-sm text-red-700 dark:text-red-400 mt-1 break-words">
																{errorMessage}
															</p>
															<button
																onClick={() => setErrorMessage(null)}
																className="text-xs text-red-600 dark:text-red-400 underline mt-2"
															>
																Dismiss
															</button>
														</div>
													</div>
												</div>
											)}
										</div>
									</div>
								</div>
							</div>

							{/* NFT Collection - Full Width */}
							{/* <div className="lg:col-span-2">
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-amber-200/50 dark:border-amber-800/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg">
                      <span className="text-2xl">🎨</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
                        NFT Collection
                      </h2>
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Your tokenized assets
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="group relative aspect-square bg-gradient-to-br from-amber-100 to-orange-100 dark:from-zinc-800 dark:to-amber-900/30 rounded-2xl flex flex-col items-center justify-center overflow-hidden border-2 border-amber-200/50 dark:border-amber-700/50 hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-300 hover:scale-105 cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-amber-400/0 group-hover:from-yellow-400/20 group-hover:to-amber-400/20 transition-all duration-300"></div>
                        <span className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">🏆</span>
                        <p className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">NFT #{n}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Coming Soon</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div> */}
						</div>
					)}

					{!isConnected && (
						<div className="text-center bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-amber-200/50 dark:border-amber-800/50 max-w-2xl mx-auto">
							<div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-500/50 animate-bounce">
								<span className="text-5xl">🔐</span>
							</div>
							<h3 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100 mb-3">
								Connect Your Wallet
							</h3>
							<p className="text-amber-700 dark:text-amber-300 text-lg">
								Connect your wallet to start minting Spart tokens and accessing your digital assets
							</p>
						</div>
					)}
				</main>

				{/* Full-width NFT marketplace section */}
				<section className="w-full mt-12" style={{ padding: '2rem 0', background: 'transparent' }}>
					<div style={{ width: '100%' }}>
						<NFTCollection />
					</div>
				</section>
			</div>
		</div>
	);
}
