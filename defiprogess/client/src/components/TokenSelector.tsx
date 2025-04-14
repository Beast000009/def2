import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverTrigger, 
  PopoverContent 
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchTokens, fetchTokenPrices, type Token, type TokenPrice } from '@/lib/api';
import { Search } from 'lucide-react';

interface TokenSelectorProps {
  selectedTokenId?: number;
  onTokenSelect: (token: Token) => void;
  excludeTokenIds?: number[];
}

const TokenSelector = ({ 
  selectedTokenId, 
  onTokenSelect,
  excludeTokenIds = []
}: TokenSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: tokens, isLoading: tokensLoading } = useQuery({
    queryKey: ['/api/tokens']
  });
  
  const { data: tokenPrices, isLoading: pricesLoading } = useQuery({
    queryKey: ['/api/prices']
  });
  
  const selectedToken = useMemo(() => {
    if (!tokens) return null;
    return tokens.find((token: Token) => token.id === selectedTokenId);
  }, [tokens, selectedTokenId]);
  
  const filteredTokens = useMemo(() => {
    if (!tokens) return [];
    
    return tokens
      .filter((token: Token) => !excludeTokenIds.includes(token.id))
      .filter((token: Token) => 
        token.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [tokens, searchTerm, excludeTokenIds]);
  
  const getTokenPrice = (tokenId: number) => {
    if (!tokenPrices) return null;
    return tokenPrices.find((price: TokenPrice) => price.id === tokenId);
  };
  
  // If there's only one token available, select it
  useEffect(() => {
    if (
      filteredTokens && 
      filteredTokens.length === 1 && 
      !selectedTokenId
    ) {
      onTokenSelect(filteredTokens[0]);
    }
  }, [filteredTokens, selectedTokenId, onTokenSelect]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center space-x-1 bg-neutral-600 hover:bg-neutral-500 border-transparent text-white"
        >
          {selectedToken ? (
            <>
              <div className="w-5 h-5 rounded-full bg-neutral-500 flex items-center justify-center overflow-hidden">
                <img src={selectedToken.logoUrl} alt={selectedToken.symbol} className="w-3 h-3" />
              </div>
              <span>{selectedToken.symbol}</span>
            </>
          ) : (
            <span>Select token</span>
          )}
          <i className="ri-arrow-down-s-line"></i>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-72 p-0 bg-neutral-800 border-neutral-700 text-white">
        <div className="p-3 border-b border-neutral-700">
          <h3 className="font-medium mb-2">Select a token</h3>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search by name or symbol"
              className="pl-8 bg-neutral-700 border-neutral-600 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="h-72">
          <div className="p-2">
            {tokensLoading || pricesLoading ? (
              <div className="flex items-center justify-center p-4">
                <span className="text-neutral-400">Loading tokens...</span>
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="flex items-center justify-center p-4">
                <span className="text-neutral-400">No tokens found</span>
              </div>
            ) : (
              filteredTokens.map((token: Token) => {
                const tokenPrice = getTokenPrice(token.id);
                
                return (
                  <button
                    key={token.id}
                    className="w-full flex items-center p-2 hover:bg-neutral-700 rounded-md transition-colors"
                    onClick={() => {
                      onTokenSelect(token);
                      setIsOpen(false);
                    }}
                  >
                    <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center overflow-hidden mr-2">
                      <img src={token.logoUrl} alt={token.symbol} className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{token.name}</div>
                      <div className="text-xs text-neutral-400">{token.symbol}</div>
                    </div>
                    {tokenPrice && (
                      <div className="text-right text-sm font-mono">
                        ${parseFloat(tokenPrice.price).toLocaleString()}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default TokenSelector;
