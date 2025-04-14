import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useWeb3 } from "@/lib/web3";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletConnectModal = ({ isOpen, onClose }: WalletConnectModalProps) => {
  const { connectWallet, isConnecting } = useWeb3();

  const handleConnectWallet = async (type: string) => {
    await connectWallet(type);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-800 border-neutral-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Connect Your Wallet</DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-neutral-400 hover:text-white">
            <X className="h-5 w-5" />
          </DialogClose>
        </DialogHeader>
        
        <div className="space-y-3 mb-6">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-between p-4 bg-neutral-700 hover:bg-neutral-600 border-transparent text-white"
            onClick={() => handleConnectWallet('metamask')}
            disabled={isConnecting}
          >
            <div className="flex items-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-8 h-8 mr-3" />
              <div className="text-left">
                <div className="font-medium">MetaMask</div>
                <div className="text-xs text-neutral-400">Connect to your MetaMask wallet</div>
              </div>
            </div>
            <i className="ri-arrow-right-line"></i>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-between p-4 bg-neutral-700 hover:bg-neutral-600 border-transparent text-white"
            onClick={() => handleConnectWallet('trustwallet')}
            disabled={isConnecting}
          >
            <div className="flex items-center">
              <img src="https://trustwallet.com/assets/images/media/assets/trust_platform.svg" alt="Trust Wallet" className="w-8 h-8 mr-3" />
              <div className="text-left">
                <div className="font-medium">Trust Wallet</div>
                <div className="text-xs text-neutral-400">Connect to your Trust Wallet</div>
              </div>
            </div>
            <i className="ri-arrow-right-line"></i>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-between p-4 bg-neutral-700 hover:bg-neutral-600 border-transparent text-white"
            onClick={() => handleConnectWallet('walletconnect')}
            disabled={isConnecting}
          >
            <div className="flex items-center">
              <img src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Blue%20(Default)/Icon.svg" alt="WalletConnect" className="w-8 h-8 mr-3" />
              <div className="text-left">
                <div className="font-medium">WalletConnect</div>
                <div className="text-xs text-neutral-400">Scan with your mobile wallet</div>
              </div>
            </div>
            <i className="ri-arrow-right-line"></i>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-between p-4 bg-neutral-700 hover:bg-neutral-600 border-transparent text-white"
            onClick={() => handleConnectWallet('coinbase')}
            disabled={isConnecting}
          >
            <div className="flex items-center">
              <img src="https://avatars.githubusercontent.com/u/18060234" alt="Coinbase Wallet" className="w-8 h-8 mr-3" />
              <div className="text-left">
                <div className="font-medium">Coinbase Wallet</div>
                <div className="text-xs text-neutral-400">Connect to Coinbase Wallet</div>
              </div>
            </div>
            <i className="ri-arrow-right-line"></i>
          </Button>
        </div>
        
        <div className="text-center text-sm text-neutral-400">
          By connecting a wallet, you agree to our <a href="#" className="text-primary-light hover:underline">Terms of Service</a> and <a href="#" className="text-primary-light hover:underline">Privacy Policy</a>.
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletConnectModal;
