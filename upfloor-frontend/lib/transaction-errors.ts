/**
 * Utility functions for handling transaction errors with user-friendly notifications
 */

export interface TransactionError {
  message: string;
  code?: string;
  shortMessage?: string;
}

/**
 * Checks if an error is a user cancellation (MetaMask rejection)
 */
export function isUserCancellation(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Common patterns for user cancellation
  const cancellationPatterns = [
    'User rejected the request',
    'User denied transaction signature',
    'User rejected',
    'User cancelled',
    'User canceled',
    'Transaction was rejected',
    'MetaMask Tx Signature: User denied transaction signature',
    'ContractFunctionExecutionError: User rejected the request'
  ];
  
  return cancellationPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Gets a user-friendly error message for transaction errors
 */
export function getTransactionErrorMessage(error: unknown): { title: string; description: string; variant: 'default' | 'destructive' } {
  if (isUserCancellation(error)) {
    return {
      title: "Transaction Cancelled",
      description: "You cancelled the transaction in MetaMask. No changes were made.",
      variant: 'default'
    };
  }
  
  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('insufficient funds')) {
      return {
        title: "Insufficient Funds",
        description: "You don't have enough balance to complete this transaction.",
        variant: 'destructive'
      };
    }
    
    if (error.message.includes('gas')) {
      return {
        title: "Gas Error",
        description: "Transaction failed due to gas issues. Please try again.",
        variant: 'destructive'
      };
    }
    
    if (error.message.includes('network') || error.message.includes('connection')) {
      return {
        title: "Network Error",
        description: "Please check your network connection and try again.",
        variant: 'destructive'
      };
    }
    
    // Generic error
    return {
      title: "Transaction Failed",
      description: error.message || "An unexpected error occurred. Please try again.",
      variant: 'destructive'
    };
  }
  
  // Fallback for unknown error types
  return {
    title: "Transaction Failed",
    description: "An unexpected error occurred. Please try again.",
    variant: 'destructive'
  };
}

/**
 * Checks if an error should be logged (not user cancellations)
 */
export function shouldLogError(error: unknown): boolean {
  return !isUserCancellation(error);
}
