import React, { useState } from 'react';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { TeleportService, TeleportParams } from '../services/teleport';
import { WalletService } from '../services/wallet';
import './Teleport.css';

// Sepolia testnet configuration
const SEPOLIA_CONFIG = {
  chainId: 11155111,
};

const Teleport: React.FC = () => {
  const [amount, setAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAccount || !amount || !recipient) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setStatus('Preparing teleport transaction...');
    setError('');

    try {
      const api = await WalletService.connectApi();
      
      const params: TeleportParams = {
        assetId: 0, // tVFY token
        destination: 'Evm',
        chainId: SEPOLIA_CONFIG.chainId,
        recipient: recipient,
        amount: TeleportService.formatAmount(amount),
        timeout: 0, // No timeout
        relayerFee: '0',
        redeem: false
      };

      setStatus('Waiting for wallet signature...');
      const hash = await TeleportService.teleportToEvm(api, selectedAccount, params);
      setStatus(`Teleport transaction submitted! Hash: ${hash}`);
      setAmount('');
      setRecipient('');
    } catch (error: any) {
      console.error('Error teleporting tokens:', error);
      setError(error.message);
      setStatus('Failed to teleport tokens');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="teleport">
      <h2>Teleport tVFY Tokens</h2>
      <p className="info">Teleport your tVFY tokens from zkVerify to Ethereum Sepolia network</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="wallet-status">
        <p>{status}</p>
        {!accounts.length && (
          <button 
            onClick={connectWallet} 
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>

      {accounts.length > 0 && (
        <form onSubmit={handleSubmit} className="teleport-form">
          <div className="form-group">
            <label htmlFor="account">Source Account:</label>
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
            <label htmlFor="amount">Amount (tVFY):</label>
            <input
              type="text"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount of tVFY"
              pattern="[0-9]*\.?[0-9]*"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="recipient">Recipient (Ethereum Address):</label>
            <input
              type="text"
              id="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              pattern="^0x[a-fA-F0-9]{40}$"
              required
            />
            <small>Enter a valid Ethereum address starting with 0x</small>
          </div>

          <button type="submit" disabled={isLoading || !selectedAccount}>
            {isLoading ? 'Processing...' : 'Teleport Tokens'}
          </button>
        </form>
      )}

      <div className="network-info">
        <h3>Network Details</h3>
        <p>Destination Network: Ethereum Sepolia Testnet</p>
        <p>Chain ID: {SEPOLIA_CONFIG.chainId}</p>
      </div>
    </div>
  );
};

export default Teleport; 