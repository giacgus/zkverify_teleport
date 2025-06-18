import { ethers } from 'ethers';

export class EthereumService {
  private static provider: ethers.BrowserProvider | null = null;
  private static signer: ethers.JsonRpcSigner | null = null;

  static disconnect() {
    this.provider = null;
    this.signer = null;
  }

  static async checkMetaMaskInstalled(): Promise<boolean> {
    const ethereum = (window as any).ethereum;
    if (!ethereum || !ethereum.isMetaMask) {
      throw new Error('MetaMask not found. Please install MetaMask from https://metamask.io/');
    }
    return true;
  }

  static async connectToSepolia(): Promise<string> {
    try {
      await this.checkMetaMaskInstalled();
      const ethereum = (window as any).ethereum;

      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create ethers provider and signer
      this.provider = new ethers.BrowserProvider(ethereum);
      this.signer = await this.provider.getSigner();

      // Check if we're on Sepolia
      const network = await this.provider.getNetwork();
      if (network.chainId !== BigInt(11155111)) { // Sepolia chainId
        try {
          // Try to switch to Sepolia
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // 11155111 in hex
          });
        } catch (switchError: any) {
          // If Sepolia is not added to MetaMask, add it
          if (switchError.code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia',
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'SEP',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }]
            });
          } else {
            throw switchError;
          }
        }
      }

      return accounts[0];
    } catch (error: any) {
      console.error('Error connecting to MetaMask:', error);
      throw new Error(error.message || 'Failed to connect to MetaMask');
    }
  }

  static async getAddress(): Promise<string | null> {
    if (!this.signer) return null;
    return await this.signer.getAddress();
  }

  static async sendTransaction(to: string, value: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await this.signer.sendTransaction({
        to,
        value: ethers.parseEther(value)
      });

      return tx.hash;
    } catch (error: any) {
      console.error('Error sending transaction:', error);
      throw new Error(error.message || 'Failed to send transaction');
    }
  }
} 