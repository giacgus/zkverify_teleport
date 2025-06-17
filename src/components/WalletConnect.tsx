import React, { useState, useEffect } from 'react';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { WalletService } from '../services/wallet';
import './WalletConnect.css';

const WalletConnect: React.FC = () => {
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [remark, setRemark] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      await WalletService.checkWalletInstalled();
      setIsWalletConnected(true);
      setError('');
      // Don't automatically connect, wait for user to click the button
    } catch (error: any) {
      setError(error.message);
      setIsWalletConnected(false);
    }
  };

  const connectWallet = async () => {
    try {
      setStatus('Connecting to wallet...');
      setError('');
      setIsLoading(true);
      
      const walletAccounts = await WalletService.getAccounts();
      setAccounts(walletAccounts);
      setStatus(`Connected with ${walletAccounts.length} account${walletAccounts.length !== 1 ? 's' : ''}`);
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setError(error.message);
      setStatus('Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = accounts.find(acc => acc.address === event.target.value);
    setSelectedAccount(selected || null);
  };

  const handleRemarkChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRemark(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAccount || !remark.trim()) {
      setError('Please select an account and enter a remark');
      return;
    }

    setIsLoading(true);
    setStatus('Waiting for wallet signature...');
    setError('');

    try {
      const hash = await WalletService.sendRemark(selectedAccount, remark);
      setStatus(`Transaction submitted! Hash: ${hash}`);
      setRemark('');
    } catch (error: any) {
      console.error('Error sending remark:', error);
      setError(error.message);
      setStatus('Failed to send remark');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="wallet-connect">
      <h2>Wallet Connection</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="wallet-status">
        <p>{status}</p>
        {!accounts.length && (
          <button 
            onClick={connectWallet} 
            disabled={isLoading || !isWalletConnected}
            className={!isWalletConnected ? 'button-warning' : ''}
          >
            {!isWalletConnected 
              ? 'Please Install Polkadot Wallet' 
              : isLoading 
                ? 'Connecting...' 
                : 'Connect Wallet'}
          </button>
        )}
      </div>

      {accounts.length > 0 && (
        <form onSubmit={handleSubmit} className="remark-form">
          <div className="form-group">
            <label htmlFor="account">Select Account:</label>
            <select
              id="account"
              onChange={handleAccountChange}
              value={selectedAccount?.address || ''}
              required
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option key={account.address} value={account.address}>
                  {account.meta.name} ({account.address.slice(0, 6)}...{account.address.slice(-6)})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="remark">Remark:</label>
            <textarea
              id="remark"
              value={remark}
              onChange={handleRemarkChange}
              placeholder="Enter your remark..."
              required
            />
          </div>

          <button type="submit" disabled={isLoading || !selectedAccount}>
            {isLoading ? 'Waiting for wallet...' : 'Send Remark'}
          </button>
        </form>
      )}
    </div>
  );
};

export default WalletConnect; 