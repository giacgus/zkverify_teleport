import React, { useState, useEffect } from 'react';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { WalletService } from '../services/wallet';
import { EthereumService } from '../services/ethereum';
import { TeleportService, TeleportParams } from '../services/teleport';
import './Teleport.css';
import zkVerifyLogo from '../assets/zkverify_logo.png';
import { ReactComponent as EthereumLogo } from '../assets/ethereum_logo.svg';
import { ReactComponent as LoadingIcon } from '../assets/loading_icon.svg';
import { ReactComponent as SuccessIcon } from '../assets/success_icon.svg';
import { ReactComponent as ErrorIcon } from '../assets/error_icon.svg';
import chevronIcon from '../assets/chevron.png';
import { ethers } from 'ethers';

// Sepolia testnet configuration
const SEPOLIA_CONFIG = {
  chainId: 11155111,
};

interface WalletState {
  zkVerify: {
    accounts: InjectedAccountWithMeta[];
    account: InjectedAccountWithMeta | null;
    balance: string;
    isConnected: boolean;
    error: string;
  };
  ethereum: {
    address: string;
    balance: string;
    usdhBalance: string;
    ethBalance: string;
    isConnected: boolean;
    error: string;
  };
}

type ModalStatus = 'idle' | 'loading' | 'success' | 'error';

const WalletConnect: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<React.ReactNode>('');
  const [modalTxHash, setModalTxHash] = useState<string>('');
  const [modalStatus, setModalStatus] = useState<ModalStatus>('idle');
  const [amount, setAmount] = useState<string>('');
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isZkVerifyHelpOpen, setIsZkVerifyHelpOpen] = useState<boolean>(false);
  const [direction, setDirection] = useState<'zkToEth' | 'ethToZk'>('zkToEth');
  const [tvyfAllowance, setTvyfAllowance] = useState<string>('0');
  const [usdhAllowance, setUsdhAllowance] = useState<string>('0');
  const [walletState, setWalletState] = useState<WalletState>({
    zkVerify: { accounts: [], account: null, balance: '0', isConnected: false, error: '' },
    ethereum: { address: '', balance: '0', usdhBalance: '0', ethBalance: '0', isConnected: false, error: '' },
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

  useEffect(() => {
    if (walletState.zkVerify.account) {
      WalletService.getAccountBalance(walletState.zkVerify.account.address).then(balance => {
        setWalletState(prev => ({
          ...prev,
          zkVerify: { ...prev.zkVerify, balance }
        }));
      });
    }
  }, [walletState.zkVerify.account]);

  useEffect(() => {
    if (walletState.ethereum.isConnected && walletState.ethereum.address) {
      EthereumService.getTVFYBalance(walletState.ethereum.address).then(balance => {
        setWalletState(prev => ({ ...prev, ethereum: { ...prev.ethereum, balance } }));
      });
      EthereumService.getUSDHBalance(walletState.ethereum.address).then(usdhBalance => {
        setWalletState(prev => ({ ...prev, ethereum: { ...prev.ethereum, usdhBalance } }));
      });
      EthereumService.getEthBalance(walletState.ethereum.address).then(ethBalance => {
        setWalletState(prev => ({ ...prev, ethereum: { ...prev.ethereum, ethBalance } }));
      });
    }
  }, [walletState.ethereum.isConnected, walletState.ethereum.address]);

  useEffect(() => {
    if (direction === 'ethToZk' && walletState.ethereum.isConnected && walletState.ethereum.address) {
      EthereumService.getTVFYAllowance().then(setTvyfAllowance);
      EthereumService.getUSDHAllowance().then(setUsdhAllowance);
    }
  }, [direction, walletState.ethereum.isConnected, walletState.ethereum.address]);

  const testAmount = '0.00001'; // Hardcoded for debugging

  const formatBalance = (balance: string) => {
    try {
      const balanceBigInt = BigInt(balance);
      const decimals = 18;
      const integerPart = balanceBigInt / BigInt(10 ** decimals);
      const fractionalPart = balanceBigInt % BigInt(10 ** decimals);
      const fractionalString = fractionalPart.toString().padStart(decimals, '0').substring(0, 4);
      return `${integerPart}.${fractionalString}`;
    } catch (e) {
      console.error("Could not format balance", e);
      return "0.0000";
    }
  };

  const connectToZkVerify = async () => {
    setIsLoading(true);
    try {
      await WalletService.checkWalletInstalled();
      const accounts = await WalletService.getAccounts();
      if (accounts.length > 0) {
        setWalletState(prev => ({
          ...prev,
          zkVerify: {
            ...prev.zkVerify,
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
    try {
      const address = await EthereumService.connectToSepolia();
      setWalletState(prev => ({ ...prev, ethereum: { ...prev.ethereum, address, isConnected: true, error: '' } }));
    } catch (error: any) {
      setWalletState(prev => ({ ...prev, ethereum: { ...prev.ethereum, error: error.message } }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = (walletType: 'zkVerify' | 'ethereum') => {
    if (walletType === 'zkVerify') {
      WalletService.disconnect();
      setWalletState(prev => ({
        ...prev,
        zkVerify: {
          accounts: [],
          account: null,
          balance: '0',
          isConnected: false,
          error: '',
        }
      }));
    } else {
      EthereumService.disconnect();
      setWalletState(prev => ({
        ...prev,
        ethereum: {
          address: '',
          balance: '0',
          usdhBalance: '0',
          ethBalance: '0',
          isConnected: false,
          error: '',
        }
      }));
    }
    setModalMessage('');
    setModalTxHash('');
    setModalStatus('idle');
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

  const handleSwap = () => {
    setDirection(prev => (prev === 'zkToEth' ? 'ethToZk' : 'zkToEth'));
    setModalMessage('');
    setModalTxHash('');
    setModalStatus('idle');
    setAmount('');
    setTvyfAllowance('0');
    setUsdhAllowance('0');
  };

  const handleApproval = async (
    approvalFn: () => Promise<ethers.TransactionResponse>,
    tokenName: string
  ) => {
    setIsLoading(true);
    setModalMessage(`Requesting ${tokenName} approval in your wallet...`);
    setModalStatus('loading');
    setIsModalOpen(true);
    setModalTxHash('');

    try {
      const tx = await approvalFn();
      setModalMessage(`Approval sent. Waiting for confirmation...`);
      setModalTxHash(tx.hash);

      await tx.wait(); // Wait for the transaction to be mined

      setModalMessage(`${tokenName} successfully approved!`);
      setModalStatus('success');
      await Promise.all([
          EthereumService.getTVFYAllowance().then(setTvyfAllowance),
          EthereumService.getUSDHAllowance().then(setUsdhAllowance)
      ]);

    } catch (error: any) {
      console.error(`Error approving ${tokenName}:`, error);
      setModalMessage(`Error: ${error.message}`);
      setModalStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTvyf = () => handleApproval(EthereumService.approveTokenGateway, 'tVFY');
  
  const handleApproveUsdh = () => handleApproval(EthereumService.approveUSDHGateway, 'Fee Token (USD.H)');
  
  const handleDrip = async () => {
    setIsLoading(true);
    setModalMessage('Requesting USD.H from the faucet...');
    setModalStatus('loading');
    setIsModalOpen(true);
    setModalTxHash('');
    try {
      const tx = await EthereumService.dripFromFaucet();
      setModalMessage(`Faucet drip sent. Waiting for confirmation...`);
      setModalTxHash(tx.hash);
      
      await tx.wait();

      const newBalance = await EthereumService.getUSDHBalance(walletState.ethereum.address);
      setWalletState(prev => ({ ...prev, ethereum: { ...prev.ethereum, usdhBalance: newBalance } }));
      
      setModalMessage('USD.H balance updated!');
      setModalStatus('success');
    } catch (error: any) {
      console.error('Error getting tokens from faucet:', error);
      setModalMessage(`Error: ${error.message}`);
      setModalStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeleport = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setModalMessage('Preparing teleport transaction...');
    setModalTxHash('');
    setModalStatus('loading');
    setIsModalOpen(true);

    if (direction === 'zkToEth') {
      const { zkVerify, ethereum } = walletState;
      if (!zkVerify.account || !ethereum.address || !amount) {
        setModalMessage('Please connect both wallets and enter an amount.');
        setIsLoading(false);
        return;
      }

      if (ethers.parseEther(amount) > BigInt(zkVerify.balance)) {
        setModalMessage('Amount exceeds your available balance.');
        setIsLoading(false);
        return;
      }

      try {
        const api = await WalletService.connectApi();
        const params: TeleportParams = {
          assetId: 0,
          destination: 'Evm',
          chainId: SEPOLIA_CONFIG.chainId,
          recipient: ethereum.address,
          amount: ethers.parseEther(amount).toString(),
          timeout: 0,
          relayerFee: '0',
          redeem: false,
        };

        setModalMessage('Waiting for wallet signature...');
        const hash = await TeleportService.teleportToEvm(api, zkVerify.account, params);
        setModalMessage('Teleport transaction submitted!');
        setModalStatus('success');
        setModalTxHash(hash);
        setAmount('');
      } catch (error: any) {
        console.error('Error teleporting tokens:', error);
        setModalMessage(`Error: ${error.message}`);
        setModalStatus('error');
      } finally {
        setIsLoading(false);
      }
    } else { // ethToZk
      const { zkVerify, ethereum } = walletState;
      if (!zkVerify.account || !ethereum.address || !amount) {
        setModalMessage('Please connect both wallets and enter an amount.');
        setIsLoading(false);
        return;
      }

      if (ethers.parseEther(amount) > BigInt(ethereum.balance)) {
        setModalMessage('Amount exceeds your available tVFY balance.');
        setIsLoading(false);
        return;
      }

      if (BigInt(walletState.ethereum.usdhBalance) < ethers.parseEther('1')) {
        setModalMessage('You need at least 1 USD.H to pay for fees.');
        setIsLoading(false);
        return;
      }

      try {
        setModalMessage('Waiting for wallet signature...');
        const hash = await EthereumService.teleportToZkVerify({
          amount,
          recipient: zkVerify.account.address,
        });
        setModalMessage('Teleport transaction submitted!');
        setModalStatus('success');
        setModalTxHash(hash);
        setAmount('');
      } catch (error: any) {
        console.error('Error teleporting to zkVerify:', error);
        setModalMessage(`Error: ${error.message}`);
        setModalStatus('error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const needsTvyfApproval = direction === 'ethToZk' && amount && ethers.parseEther(amount) > BigInt(tvyfAllowance);
  const needsUsdhApproval = direction === 'ethToZk' && BigInt(usdhAllowance) < ethers.parseEther('1'); // Check for at least 1 USD.H allowance
  const hasEnoughFee = direction === 'ethToZk' ? BigInt(walletState.ethereum.usdhBalance) >= ethers.parseEther('1') : true;
  const hasEnoughGas = direction === 'ethToZk' ? BigInt(walletState.ethereum.ethBalance) >= ethers.parseEther('0.01') : true; // Min gas fee for teleport

  const getButton = () => {
    if (direction === 'zkToEth') {
      return (
        <button onClick={handleTeleport} disabled={isLoading || !amount || ethers.parseEther(amount) > BigInt(walletState.zkVerify.balance)} className="teleport-button">
          {isLoading ? 'Teleporting...' : 'Teleport'}
        </button>
      );
    }

    // ethToZk direction
    if (needsTvyfApproval) {
      return <button onClick={handleApproveTvyf} disabled={isLoading || !amount} className="teleport-button">Approve tVFY</button>;
    }
    if (needsUsdhApproval) {
      return <button onClick={handleApproveUsdh} disabled={isLoading} className="teleport-button">Approve Fee Token (USD.H)</button>;
    }
    return (
      <button onClick={handleTeleport} disabled={isLoading || !amount || ethers.parseEther(amount) > BigInt(walletState.ethereum.balance)} className="teleport-button">
        {isLoading ? 'Teleporting...' : 'Teleport'}
      </button>
    );
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

  const sourcePanel = direction === 'zkToEth'
    ? renderWalletPanel('zkVerify', 'zkVerify Volta', <img src={zkVerifyLogo} alt="zkVerify Logo" className="logo-img" />, walletState.zkVerify, connectToZkVerify)
    : renderWalletPanel('ethereum', 'Ethereum Sepolia', <EthereumLogo />, walletState.ethereum, connectToEthereum);

  const destinationPanel = direction === 'zkToEth'
    ? renderWalletPanel('ethereum', 'Ethereum Sepolia', <EthereumLogo />, walletState.ethereum, connectToEthereum)
    : renderWalletPanel('zkVerify', 'zkVerify Volta', <img src={zkVerifyLogo} alt="zkVerify Logo" className="logo-img" />, walletState.zkVerify, connectToZkVerify);

  return (
    <div className="teleporter-layout">
      <div className="bridge-container">
        <div className="help-section">
          <button onClick={() => setIsZkVerifyHelpOpen(true)} className="link-button">
            Can't find your account?
          </button>
          <button onClick={() => setIsTutorialOpen(true)} className="link-button">
            How to see tVFY on MetaMask?
          </button>
        </div>

        <div className="bridge-flow-selector">
          <div className={`chain-box ${direction === 'zkToEth' ? 'active' : ''}`}>
            {renderWalletPanel('zkVerify', 'zkVerify Volta', <img src={zkVerifyLogo} alt="zkVerify Logo" className="logo-img" />, walletState.zkVerify, connectToZkVerify)}
          </div>
          <div className="direction-switcher">
            <button onClick={handleSwap} className="change-direction-button">
              <img src={chevronIcon} alt="Swap" className={`swap-chevron ${direction === 'ethToZk' ? 'rotate' : ''}`} />
              <span>Swap Direction</span>
            </button>
          </div>
          <div className={`chain-box ${direction === 'ethToZk' ? 'active' : ''}`}>
            {renderWalletPanel('ethereum', 'Ethereum Sepolia', <EthereumLogo />, walletState.ethereum, connectToEthereum)}
          </div>
        </div>
        
        {direction === 'zkToEth' && (
          <div className="fee-info-panel">
            <h4>Need Testnet Tokens?</h4>
            <p>
              Get tVFY for the zkVerify Volta testnet from the faucet.
            </p>
            <a
              href="https://www.faucy.com/zkverify-volta"
              target="_blank"
              rel="noopener noreferrer"
              className="link-button"
            >
              zkVerify Faucet
            </a>
          </div>
        )}

        {direction === 'ethToZk' && walletState.ethereum.isConnected && (
          <div className="fee-info-panel">
            <div className="fee-header">
              <h4>Bridging Requirements</h4>
            </div>
            
            <div className="requirement-row">
              <div className="requirement-label">
                <span className="token-name">Gas (Sepolia ETH)</span>
                <span className="balance-display">Balance: {formatBalance(walletState.ethereum.ethBalance)}</span>
              </div>
              <div className="requirement-action">
                {hasEnoughGas ? (
                  <span className="success-text">✓ Sufficient</span>
                ) : (
                  <a
                    href="https://www.google.com/search?q=sepolia+eth+faucet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-button"
                  >
                    Find Faucet
                  </a>
                )}
              </div>
            </div>

            <div className="requirement-row">
              <div className="requirement-label">
                <span className="token-name">Fee Token (USD.H)</span>
                <span className="balance-display">Balance: {formatBalance(walletState.ethereum.usdhBalance)}</span>
              </div>
              <div className="requirement-action">
                {hasEnoughFee ? (
                  <span className="success-text">✓ Sufficient</span>
                ) : (
                  <div className="action-with-icon">
                    <ErrorIcon />
                    <button onClick={handleDrip} disabled={isLoading} className="link-button">
                      Get from Faucet
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {walletState.zkVerify.isConnected && walletState.ethereum.isConnected && (
          <div className="teleport-controls">
            <div className="form-group amount-group">
              <div className="form-group-header">
                <label htmlFor="amount">Amount to Teleport</label>
                <div className="balance-info">
                  Balance: {formatBalance(direction === 'zkToEth' ? walletState.zkVerify.balance : walletState.ethereum.balance)} tVFY
                </div>
              </div>
              <div className="amount-input-wrapper">
                <input
                  type="text"
                  id="amount"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '.');
                    if (/^[0-9]*\.?[0-9]*$/.test(value)) {
                      setAmount(value);
                    }
                  }}
                  placeholder="0.0"
                  pattern="[0-9]*\.?[0-9]*"
                />
                <button onClick={() => setAmount(formatBalance(direction === 'zkToEth' ? walletState.zkVerify.balance : walletState.ethereum.balance))} className="max-button">
                  Max
                </button>
              </div>
            </div>
            {getButton()}
          </div>
        )}

        {isModalOpen && (
          <div className="status-modal-backdrop">
            <div className="status-modal-content">
              <div className="modal-icon">
                {modalStatus === 'loading' && <LoadingIcon className="spinning" />}
                {modalStatus === 'success' && <SuccessIcon />}
                {modalStatus === 'error' && <ErrorIcon />}
              </div>
              <p>{modalMessage}</p>
              {modalTxHash && (
                <>
                  <p>
                    Track on {direction === 'zkToEth' ? 'zkVerify' : 'Sepolia'}:{' '}
                    <a
                      href={
                        direction === 'zkToEth'
                          ? `https://zkverify-testnet.subscan.io/extrinsic/${modalTxHash}`
                          : `https://sepolia.etherscan.io/tx/${modalTxHash}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {modalTxHash.slice(0, 8)}...{modalTxHash.slice(-8)}
                    </a>
                  </p>
                  {modalMessage && modalMessage.toString().toLowerCase().includes('submitted') && (
                    <p className="final-message">
                      Your balance will be visible on {direction === 'zkToEth' ? 'Sepolia' : 'zkVerify'} within {direction === 'zkToEth' ? '10' : '25'} minutes.
                      <br/>
                      {direction === 'zkToEth' ? (
                        <>
                          View the token on {' '}
                          <a href="https://sepolia.etherscan.io/token/0x22d10f789847833607a28769cedd2778ebfba429" target="_blank" rel="noopener noreferrer">
                            Etherscan
                          </a>.
                        </>
                      ) : (
                        <>
                          Monitor the {' '}
                          <a href="https://zkverify-testnet.subscan.io/account/xphg8cRoGsLp1Fe4LskP2D78hyLuERT8w6TauPyb6YLQXHuQ3" target="_blank" rel="noopener noreferrer">
                            redistribution contract
                          </a>
                          {' '}on Subscan.
                        </>
                      )}
                    </p>
                  )}
                </>
              )}
              <button onClick={() => {setIsModalOpen(false); setModalStatus('idle');}} className="link-button" style={{marginTop: '1rem'}}>Close</button>
            </div>
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
      {isZkVerifyHelpOpen && (
        <div className="tutorial-modal-backdrop" onClick={() => setIsZkVerifyHelpOpen(false)}>
          <div className="tutorial-modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsZkVerifyHelpOpen(false)} className="close-button">×</button>
            <div className="tutorial-panel">
              <h2>Can't Find Your Account?</h2>
              <p>
                If you've already connected your wallet and want to use a different account, you first need to revoke the website's permissions from your wallet extension. This forces the wallet to re-ask for permission, allowing you to select different accounts.
              </p>
              <p>
                <strong>For Polkadot-based wallets (Talisman, Polkadot.js, etc.):</strong>
              </p>
              <ol>
                <li>Open your wallet extension.</li>
                <li>Navigate to the "Connected Dapps" or "Manage Website Access" section (this is often under Settings ⚙️).</li>
                <li>Find this website (zkVerify Teleporter) in the list and click "Forget" or "Revoke".</li>
                <li>Return to this page and click "Connect Wallet" again.</li>
              </ol>
              <p>
                <strong>For EVM wallets (MetaMask, etc.):</strong>
              </p>
              <ol>
                <li>Open MetaMask and click the three-dot menu (⋮) next to your account.</li>
                <li>Select "Connected sites".</li>
                <li>Find this website in the list and click the trash can icon (🗑️) to disconnect.</li>
                <li>Return to this page and click "Connect Wallet" again.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnect; 