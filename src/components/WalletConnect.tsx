import React, { useState, useEffect } from 'react';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { WalletService } from '../services/wallet';
import { EthereumService } from '../services/ethereum';
import { TeleportService, TeleportParams } from '../services/teleport';
import './Teleport.css';
import zkVerifyLogo from '../assets/zkverify_logo.png';
import { ReactComponent as EthereumLogo } from '../assets/ethereum_logo.svg';

// Sepolia testnet configuration
const SEPOLIA_CONFIG = {
  chainId: 11155111,
};

interface WalletState {
  zkVerify: {
    accounts: InjectedAccountWithMeta[];
    account: InjectedAccountWithMeta | null;
    isConnected: boolean;
    error: string;
  };
  ethereum: {
    address: string;
    isConnected: boolean;
    error: string;
  };
}

const WalletConnect: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [walletState, setWalletState] = useState<WalletState>({
    zkVerify: { accounts: [], account: null, isConnected: false, error: '' },
    ethereum: { address: '', isConnected: false, error: '' },
  });

  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0 && walletState.ethereum.isConnected) {
        setWalletState(prev => ({
          ...prev,
          ethereum: { ...prev.ethereum, address: accounts[0] }
        }));
      } else {
        // If accounts is empty, it means the user disconnected all accounts
        handleDisconnect('ethereum');
      }
    };

    const ethereum = (window as any).ethereum;
    if (ethereum && ethereum.isMetaMask) {
      ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (ethereum && ethereum.isMetaMask) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [walletState.ethereum.isConnected]);

  const connectToZkVerify = async () => {
    setIsLoading(true);
    setStatus('');
    try {
      await WalletService.checkWalletInstalled();
      const accounts = await WalletService.getAccounts();
      if (accounts.length > 0) {
        setWalletState(prev => ({
          ...prev,
          zkVerify: {
            accounts: accounts,
            account: accounts[0],
            isConnected: true,
            error: ''
          }
        }));
      }
    } catch (error: any) {
      setWalletState(prev => ({ ...prev, zkVerify: { ...prev.zkVerify, error: error.message } }));
    } finally {
      setIsLoading(false);
    }
  };

  const connectToEthereum = async () => {
    setIsLoading(true);
    setStatus('');
    try {
      const address = await EthereumService.connectToSepolia();
      setWalletState(prev => ({ ...prev, ethereum: { address, isConnected: true, error: '' } }));
    } catch (error: any) {
      setWalletState(prev => ({ ...prev, ethereum: { ...prev.ethereum, error: error.message } }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = (walletType: 'zkVerify' | 'ethereum') => {
    if (walletType === 'zkVerify') {
      setWalletState(prev => ({
        ...prev,
        zkVerify: {
          accounts: [],
          account: null,
          isConnected: false,
          error: '',
        }
      }));
    } else {
      setWalletState(prev => ({
        ...prev,
        ethereum: {
          address: '',
          isConnected: false,
          error: '',
        }
      }));
    }
    setStatus('');
    setTxHash('');
  };

  const handleZkVerifyAccountChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedAddress = event.target.value;
    const selectedAccount = walletState.zkVerify.accounts.find(acc => acc.address === selectedAddress);
    if (selectedAccount) {
      setWalletState(prev => ({
        ...prev,
        zkVerify: { ...prev.zkVerify, account: selectedAccount }
      }));
    }
  };

  const handleTeleport = async (event: React.FormEvent) => {
    event.preventDefault();
    const { zkVerify, ethereum } = walletState;
    if (!zkVerify.account || !ethereum.address || !amount) {
      setStatus('Please connect both wallets and enter an amount.');
      return;
    }

    setIsLoading(true);
    setStatus('Preparing teleport transaction...');
    setTxHash('');

    try {
      const api = await WalletService.connectApi();
      const params: TeleportParams = {
        assetId: 0,
        destination: 'Evm',
        chainId: SEPOLIA_CONFIG.chainId,
        recipient: ethereum.address,
        amount: TeleportService.formatAmount(amount),
        timeout: 0,
        relayerFee: '0',
        redeem: false,
      };

      setStatus('Waiting for wallet signature...');
      const hash = await TeleportService.teleportToEvm(api, zkVerify.account, params);
      setStatus('Teleport transaction submitted!');
      setTxHash(hash);
      setAmount('');
    } catch (error: any) {
      console.error('Error teleporting tokens:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderWalletPanel = (
    type: 'zkVerify' | 'ethereum',
    title: string,
    logo: React.ReactNode,
    state: any,
    connectFn: () => void
  ) => {
    const isConnected = state.isConnected;

    return (
      <div className="bridge-panel">
        <div className="panel-header">
          {logo}
          <span>{title}</span>
        </div>
        <div className="panel-body">
          {isConnected ? (
            <div className="connection-details">
              {type === 'zkVerify' && state.accounts.length > 1 ? (
                <div className="form-group">
                  <select
                    value={state.account?.address || ''}
                    onChange={handleZkVerifyAccountChange}
                    className="account-select"
                  >
                    {state.accounts.map((acc: InjectedAccountWithMeta) => (
                      <option key={acc.address} value={acc.address}>
                        {acc.meta.name} ({acc.address.slice(0, 6)}...{acc.address.slice(-6)})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="address-display">
                  {type === 'zkVerify'
                    ? `${state.account.meta.name} (${state.account.address.slice(0, 6)}...${state.account.address.slice(-6)})`
                    : `${state.address.slice(0, 6)}...${state.address.slice(-6)}`}
                </div>
              )}
              <button onClick={() => handleDisconnect(type)} className="disconnect-button-small">
                Disconnect
              </button>
              {type === 'ethereum' && (
                <button onClick={() => setIsTutorialOpen(true)} className="link-button">
                  How to see tVFY on MetaMask?
                </button>
              )}
            </div>
          ) : (
            <button onClick={connectFn} disabled={isLoading} className="connect-button">
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
          {state.error && <div className="panel-error">{state.error}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="teleporter-layout">
      <div className="bridge-container">
        <h1>zkVerify Teleporter</h1>
        <div className="bridge-main">
          {renderWalletPanel('zkVerify', 'zkVerify', <img src={zkVerifyLogo} alt="zkVerify Logo" className="logo-img" />, walletState.zkVerify, connectToZkVerify)}
          
          <div className="bridge-arrow">→</div>

          {renderWalletPanel('ethereum', 'Ethereum Sepolia', <EthereumLogo />, walletState.ethereum, connectToEthereum)}
        </div>

        {walletState.zkVerify.isConnected && walletState.ethereum.isConnected && (
          <div className="teleport-controls">
            <div className="form-group amount-group">
              <label htmlFor="amount">Amount to Teleport</label>
              <input
                type="text"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                pattern="[0-9]*\.?[0-9]*"
              />
              <span>tVFY</span>
            </div>
            <button onClick={handleTeleport} disabled={isLoading} className="teleport-button">
              {isLoading ? 'Teleporting...' : 'Teleport'}
            </button>
          </div>
        )}

        {status && (
          <div className="status-message">
            <p>{status}</p>
            {txHash && (
              <>
                <p>
                  Track on zkVerify:{' '}
                  <a
                    href={`https://testnet.zkverify.io/extrinsics/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {txHash.slice(0, 8)}...{txHash.slice(-8)}
                  </a>
                </p>
                <p>
                  Your balance will be visible on Sepolia within 10 minutes.
                  <br />
                  View the token on{' '}
                  <a
                    href="https://sepolia.etherscan.io/token/0x22d10f789847833607a28769cedd2778ebfba429"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Etherscan
                  </a>
                  .
                </p>
              </>
            )}
          </div>
        )}
      </div>
      {isTutorialOpen && (
        <div className="tutorial-modal-backdrop" onClick={() => setIsTutorialOpen(false)}>
          <div className="tutorial-modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsTutorialOpen(false)} className="close-button">×</button>
            <div className="tutorial-panel">
              <h2>How to see your tVFY on MetaMask</h2>
              <p>
                To see your tVFY tokens in your MetaMask wallet after teleporting, you need to add it as a custom token.
              </p>
              <ol>
                <li>Open MetaMask and make sure you are on the Sepolia testnet.</li>
                <li>Click on "Import tokens".</li>
                <li>
                  Paste the following contract address in the "Token contract address" field:
                  <br />
                  <code>0x22d10f789847833607a28769cedd2778ebfba429</code>
                </li>
                <li>The token symbol and decimals should fill in automatically. If not, please enter <strong>tVFY</strong> as the symbol and <strong>18</strong> as the decimals.</li>
                <li>Click "Add custom token" and then "Import tokens".</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnect; 