'use client';

import '@rainbow-me/rainbowkit/styles.css';

import { Geist, Geist_Mono } from 'next/font/google';
import { WagmiProvider } from 'wagmi';
import { config } from '../components/config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './globals.css';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

const queryClient = new QueryClient();

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<WagmiProvider config={config}>
					<QueryClientProvider client={queryClient}>
						<RainbowKitProvider>
							<header className="spartan-header">
								<div
									className="spartan-container"
									style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
								>
									<div className="spartan-brand">
										<div className="logo">S</div>
										<div>
											<div className="title">Spart</div>
											<div className="muted" style={{ fontSize: '0.75rem' }}>
												Spart Token
											</div>
										</div>
									</div>
									<div className="spartan-connect">
										<ConnectButton />
									</div>
								</div>
							</header>
							{children}
						</RainbowKitProvider>
					</QueryClientProvider>
				</WagmiProvider>
			</body>
		</html>
	);
}
