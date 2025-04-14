import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useWeb3 } from '@/lib/web3';
import WalletConnectModal from './WalletConnectModal';
import { useQuery } from '@tanstack/react-query';
import { fetchGasPrice } from '@/lib/api';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [location] = useLocation();
  const { isConnected, address, disconnectWallet } = useWeb3();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const { data: gasPrice } = useQuery({ 
    queryKey: ['/api/gas-price'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const navItems = [
    { path: '/', icon: 'ri-dashboard-line', label: 'Dashboard' },
    { path: '/swap', icon: 'ri-swap-line', label: 'Swap' },
    { path: '/trade', icon: 'ri-stock-line', label: 'Spot Trading' },
    { path: '/portfolio', icon: 'ri-wallet-3-line', label: 'Portfolio' },
    { path: '/history', icon: 'ri-history-line', label: 'Transaction History' },
  ];

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex lg:w-64 flex-col bg-neutral-800 border-r border-neutral-700">
        <div className="p-6 border-b border-neutral-700">
          <h1 className="text-xl font-semibold flex items-center">
            <span className="w-8 h-8 rounded-full bg-primary-dark flex items-center justify-center mr-2">
              <i className="ri-exchange-fill text-white"></i>
            </span>
            DeFi Exchange
          </h1>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path}>
                  <a className={`flex items-center p-3 rounded-lg ${isActive(item.path) 
                    ? 'bg-primary bg-opacity-20 text-primary-light' 
                    : 'hover:bg-neutral-700'}`}>
                    <i className={`${item.icon} mr-3 text-lg`}></i>
                    <span>{item.label}</span>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-neutral-700">
          <div className="flex items-center justify-between px-3 py-2 mb-2 text-sm text-neutral-400">
            <span>Network</span>
            <div className="flex items-center text-primary">
              <span className="h-2 w-2 rounded-full bg-primary-light mr-1"></span>
              Ethereum
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-sm text-neutral-400">
            <span>Gas Price</span>
            <div className="flex items-center text-warning">
              <span>{gasPrice?.gasPrice || '---'} Gwei</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-neutral-800 border-b border-neutral-700 p-4">
          <div className="container mx-auto flex items-center justify-between">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center">
              <span className="w-8 h-8 rounded-full bg-primary-dark flex items-center justify-center mr-2">
                <i className="ri-exchange-fill text-white"></i>
              </span>
              <h1 className="text-xl font-semibold">DeFi Exchange</h1>
            </div>

            {/* Connect Wallet Button */}
            <div className="flex items-center gap-4">
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <span className="hidden md:inline-block text-sm text-neutral-300">
                    {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
                  </span>
                  <button 
                    onClick={() => disconnectWallet()}
                    className="inline-flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded-lg transition-colors"
                  >
                    <i className="ri-wallet-3-line"></i>
                    <span className="hidden md:inline-block">Disconnect</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsWalletModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-colors"
                >
                  <i className="ri-wallet-3-line"></i>
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Container */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-neutral-900">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-neutral-800 border-t border-neutral-700 py-2 z-10">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a className={`flex flex-col items-center px-3 py-1 ${isActive(item.path) ? 'text-primary' : 'text-neutral-400'}`}>
                <i className={`${item.icon} text-lg`}></i>
                <span className="text-xs mt-1">{item.label}</span>
              </a>
            </Link>
          ))}
        </div>
      </div>

      {/* Wallet Connect Modal */}
      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)} 
      />
    </div>
  );
};

export default Layout;