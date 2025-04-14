import { Transaction, getStatusColor, getTransactionTypeIcon, getFormattedTimeAgo } from '@/lib/api';

interface TransactionHistoryItemProps {
  transaction: Transaction;
}

const TransactionHistoryItem = ({ transaction }: TransactionHistoryItemProps) => {
  const getTransactionLabel = () => {
    if (transaction.type === 'swap') {
      return `Swap ${transaction.fromToken?.symbol || ''} for ${transaction.toToken?.symbol || ''}`;
    }
    if (transaction.type === 'buy') {
      return `Buy ${transaction.toToken?.symbol || ''}`;
    }
    if (transaction.type === 'sell') {
      return `Sell ${transaction.fromToken?.symbol || ''}`;
    }
    return 'Transaction';
  };

  const getTransactionDetails = () => {
    if (transaction.type === 'swap') {
      return `${transaction.fromAmount} ${transaction.fromToken?.symbol || ''} → ${transaction.toAmount} ${transaction.toToken?.symbol || ''}`;
    }
    if (transaction.type === 'buy') {
      return `${transaction.fromAmount} ${transaction.fromToken?.symbol || ''} → ${transaction.toAmount} ${transaction.toToken?.symbol || ''}`;
    }
    if (transaction.type === 'sell') {
      return `${transaction.fromAmount} ${transaction.fromToken?.symbol || ''} → ${transaction.toAmount} ${transaction.toToken?.symbol || ''}`;
    }
    return '';
  };

  const statusColor = getStatusColor(transaction.status);
  const iconClass = getTransactionTypeIcon(transaction.type);
  const timeAgo = getFormattedTimeAgo(transaction.timestamp);

  return (
    <div className="flex items-center p-3 bg-neutral-700 rounded-lg">
      <div className={`w-10 h-10 rounded-full ${transaction.type === 'swap' ? 'bg-primary bg-opacity-20 text-primary-light' : (transaction.type === 'buy' ? 'bg-success bg-opacity-20 text-success' : 'bg-error bg-opacity-20 text-error')} flex items-center justify-center mr-3`}>
        <i className={iconClass}></i>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">{getTransactionLabel()}</h4>
          <span className={`${statusColor} text-sm`}>{transaction.status}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-400">{timeAgo}</span>
          <span className="font-mono">{getTransactionDetails()}</span>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistoryItem;
