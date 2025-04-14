import { useState } from "react";
import { useWeb3 } from "@/lib/web3";
import { useQuery } from "@tanstack/react-query";
import { fetchTransactions } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TransactionHistoryItem from "@/components/TransactionHistoryItem";
import { Skeleton } from "@/components/ui/skeleton";
import WalletConnectModal from "@/components/WalletConnectModal";
import { getStatusColor, getTransactionTypeIcon } from "@/lib/api";

const TransactionHistory = () => {
  const { address, isConnected } = useWeb3();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  const { data: transactions, isLoading } = useQuery({
    queryKey: address ? [`/api/transactions/${address}`] : null,
    enabled: !!address && isConnected
  });

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 mb-6">
          <i className="ri-history-line text-3xl"></i>
        </div>
        <h2 className="text-2xl font-semibold mb-3">Wallet Not Connected</h2>
        <p className="text-neutral-400 max-w-md text-center mb-6">
          Connect your wallet to view your transaction history and track your DeFi activities.
        </p>
        <Button 
          className="bg-primary hover:bg-primary-dark"
          onClick={() => setIsWalletModalOpen(true)}
        >
          Connect Wallet
        </Button>
        
        <WalletConnectModal 
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
        />
      </div>
    );
  }

  const filteredTransactions = !transactions ? [] : transactions.filter(tx => {
    // Filter by type if not "all"
    if (transactionType !== "all" && tx.type !== transactionType) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        (tx.fromToken && tx.fromToken.symbol.toLowerCase().includes(searchLower)) ||
        (tx.toToken && tx.toToken.symbol.toLowerCase().includes(searchLower)) ||
        (tx.txHash && tx.txHash.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'swap':
        return 'ri-arrow-left-right-line';
      case 'buy':
        return 'ri-arrow-down-line';
      case 'sell':
        return 'ri-arrow-up-line';
      default:
        return 'ri-funds-line';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Transaction History</h1>
        <div className="text-sm text-neutral-400">
          <span className="mr-2">Connected: </span>
          <span className="bg-neutral-700 px-3 py-1 rounded-full">
            {address.substring(0, 6)}...{address.substring(address.length - 4)}
          </span>
        </div>
      </div>
      
      {/* Filters */}
      <Card className="bg-neutral-800 border-neutral-700 mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-neutral-400 mb-1 block">Search Transactions</label>
              <div className="relative">
                <Input 
                  type="text" 
                  placeholder="Search by token or hash..." 
                  className="bg-neutral-700 border-neutral-600 pl-9 text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="ri-search-line absolute left-3 top-2.5 text-neutral-400"></i>
              </div>
            </div>
            
            <div className="w-40">
              <label className="text-sm text-neutral-400 mb-1 block">Type</label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger className="bg-neutral-700 border-neutral-600 text-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="swap">Swaps</SelectItem>
                  <SelectItem value="buy">Buys</SelectItem>
                  <SelectItem value="sell">Sells</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-48">
              <label className="text-sm text-neutral-400 mb-1 block">Status</label>
              <Select defaultValue="all">
                <SelectTrigger className="bg-neutral-700 border-neutral-600 text-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-48">
              <label className="text-sm text-neutral-400 mb-1 block">Time Period</label>
              <Select defaultValue="all">
                <SelectTrigger className="bg-neutral-700 border-neutral-600 text-white">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Transactions */}
      <Card className="bg-neutral-800 border-neutral-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Transactions</CardTitle>
            <Button variant="outline" className="bg-neutral-700 hover:bg-neutral-600 border-transparent text-white">
              <i className="ri-download-line mr-2"></i> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list">
            <TabsList className="bg-neutral-700 mb-4">
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="detail">Detailed View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list">
              {isLoading ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, index) => (
                    <div key={index} className="flex items-center p-3 bg-neutral-700 rounded-lg">
                      <Skeleton className="w-10 h-10 rounded-full mr-3" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredTransactions.length > 0 ? (
                <div className="space-y-3">
                  {filteredTransactions.map((transaction) => (
                    <TransactionHistoryItem key={transaction.id} transaction={transaction} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-neutral-400">
                  <i className="ri-file-list-3-line text-3xl mb-2"></i>
                  <p className="mb-2">No transactions found</p>
                  <p className="text-sm">
                    {searchTerm || transactionType !== 'all' ? 
                      'Try changing your filters' : 
                      'Start trading to see your transaction history'}
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="detail">
              <div className="space-y-6">
                {isLoading ? (
                  <Skeleton className="h-96 w-full" />
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <Card key={transaction.id} className="bg-neutral-700 border-neutral-600">
                      <CardHeader>
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full bg-opacity-20 flex items-center justify-center mr-3 ${
                            transaction.type === 'swap' ? 'bg-primary text-primary-light' : 
                            transaction.type === 'buy' ? 'bg-success text-success' : 
                            'bg-error text-error'
                          }`}>
                            <i className={getTransactionTypeIcon(transaction.type)}></i>
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {transaction.type === 'swap' ? 
                                `Swap ${transaction.fromToken?.symbol || ''} for ${transaction.toToken?.symbol || ''}` :
                                transaction.type === 'buy' ? 
                                `Buy ${transaction.toToken?.symbol || ''}` :
                                `Sell ${transaction.fromToken?.symbol || ''}`
                              }
                            </CardTitle>
                            <div className="text-sm text-neutral-400 flex items-center mt-1">
                              <span className={getStatusColor(transaction.status)}>{transaction.status}</span>
                              <span className="mx-2">•</span>
                              {new Date(transaction.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-neutral-400 mb-1">From</div>
                            <div className="flex items-center">
                              {transaction.fromToken && (
                                <div className="w-6 h-6 rounded-full bg-neutral-600 flex items-center justify-center overflow-hidden mr-2">
                                  <img src={transaction.fromToken.logoUrl} alt={transaction.fromToken.symbol} className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{transaction.fromToken?.symbol || 'Unknown'}</div>
                                <div className="text-sm text-neutral-400">{transaction.fromAmount} tokens</div>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-neutral-400 mb-1">To</div>
                            <div className="flex items-center">
                              {transaction.toToken && (
                                <div className="w-6 h-6 rounded-full bg-neutral-600 flex items-center justify-center overflow-hidden mr-2">
                                  <img src={transaction.toToken.logoUrl} alt={transaction.toToken.symbol} className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{transaction.toToken?.symbol || 'Unknown'}</div>
                                <div className="text-sm text-neutral-400">{transaction.toAmount} tokens</div>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-neutral-400 mb-1">Network Fee</div>
                            <div className="font-mono">{transaction.networkFee} ETH</div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-neutral-400 mb-1">Transaction Hash</div>
                            <div className="font-mono text-sm text-primary-light overflow-hidden text-ellipsis">
                              {transaction.txHash || 'Pending...'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-10 text-neutral-400">
                    <i className="ri-file-list-3-line text-3xl mb-2"></i>
                    <p className="mb-2">No transactions found</p>
                    <p className="text-sm">
                      {searchTerm || transactionType !== 'all' ? 
                        'Try changing your filters' : 
                        'Start trading to see your transaction history'}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionHistory;
