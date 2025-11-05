import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ContractUI from '../components/ContractUI';

export default function Home() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#020617] to-[#001219] font-sans">
			<main className="flex min-h-screen w-full max-w-6xl flex-col items-center justify-start py-12 px-6 gap-8">
				<header className="w-full flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Image src="/globe.svg" alt="logo" width={56} height={56} />
						<div>
							<h1 className="text-4xl font-extrabold text-yellow-300 neon">Gold Stable token</h1>
							<p className="text-sm text-zinc-400">
								Premium collateralized stablecoin backed by gold reserves
							</p>
						</div>
					</div>
					<div className="flex items-center gap-4">
						<ConnectButton showBalance={false} />
					</div>
				</header>

				<div className="w-full">
					<ContractUI />
				</div>

				<footer className="w-full text-sm text-zinc-400 text-center mt-6">
					Built with Chainlink — connect your wallet and interact with the contract
				</footer>
			</main>
		</div>
	);
}
