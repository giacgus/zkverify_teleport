import { ethers, Contract } from 'ethers';
import { zeroPad, hexlify } from '@ethersproject/bytes';
import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import tokenGatewayAbi from './abi/TokenGateway.json';
import erc20Abi from './abi/ERC20.json';
import faucetAbi from './abi/Faucet.json';

const TOKEN_GATEWAY_ADDRESS = '0xFcDa26cA021d5535C3059547390E6cCd8De7acA6';
const TVFY_TOKEN_ADDRESS = '0x22d10f789847833607a28769cedd2778ebfba429';
const USDH_TOKEN_ADDRESS = '0xA801da100bF16D07F668F4A49E1f71fc54D05177';
const FAUCET_ADDRESS = '0x1794aB22388303ce9Cb798bE966eeEBeFe59C3a3';
const TVFY_ASSET_ID = '0xbce67a4632d733ff3d4599502fc9c8812688ce39220e4304bd7b43c22ae5c77c';
const ZKVERIFY_DEST_BYTES = '0x5355425354524154452d7a6b765f'; // "SUBSTRATE-zkv_"

export interface TeleportToZkVerifyParams {
  amount: string;
  recipient: string; // zkVerify address
}

let provider: ethers.BrowserProvider | null = null;
let signer: ethers.JsonRpcSigner | null = null;

export class EthereumService {
  static disconnect() {
    provider = null;
    signer = null;
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
      provider = new ethers.BrowserProvider(ethereum);
      signer = await provider.getSigner();

      // Check if we're on Sepolia
      const network = await provider.getNetwork();
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
    if (!signer) return null;
    return await signer.getAddress();
  }

  static async sendTransaction(to: string, value: string): Promise<string> {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await signer.sendTransaction({
        to,
        value: ethers.parseEther(value)
      });

      return tx.hash;
    } catch (error: any) {
      console.error('Error sending transaction:', error);
      throw new Error(error.message || 'Failed to send transaction');
    }
  }

  static async getTVFYBalance(address: string): Promise<string> {
    if (!provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const tokenContract = new Contract(TVFY_TOKEN_ADDRESS, erc20Abi, provider);
      const balance = await tokenContract.balanceOf(address);
      return balance.toString();
    } catch (error: any) {
      console.error('Error fetching tVFY balance:', error);
      return '0';
    }
  }

  static async getUSDHBalance(address: string): Promise<string> {
    if (!provider) {
      throw new Error('Wallet not connected');
    }
    const tokenContract = new Contract(USDH_TOKEN_ADDRESS, erc20Abi, provider);
    const balance = await tokenContract.balanceOf(address);
    return balance.toString();
  }

  static async getTVFYAllowance(): Promise<string> {
    if (!provider || !signer) {
      throw new Error('Wallet not connected');
    }
    const userAddress = await signer.getAddress();
    const tokenContract = new Contract(TVFY_TOKEN_ADDRESS, erc20Abi, provider);
    const allowance = await tokenContract.allowance(userAddress, TOKEN_GATEWAY_ADDRESS);
    return allowance.toString();
  }

  static async getUSDHAllowance(): Promise<string> {
    if (!provider || !signer) {
      throw new Error('Wallet not connected');
    }
    const userAddress = await signer.getAddress();
    const tokenContract = new Contract(USDH_TOKEN_ADDRESS, erc20Abi, provider);
    const allowance = await tokenContract.allowance(userAddress, TOKEN_GATEWAY_ADDRESS);
    return allowance.toString();
  }

  static async approveTokenGateway(): Promise<ethers.TransactionResponse> {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tokenContract = new Contract(TVFY_TOKEN_ADDRESS, erc20Abi, signer);
      const tx = await tokenContract.approve(TOKEN_GATEWAY_ADDRESS, ethers.MaxUint256);
      return tx;
    } catch (error: any) {
      console.error('Error approving token:', error);
      throw new Error(error.message || 'Failed to approve token');
    }
  }

  static async approveUSDHGateway(): Promise<ethers.TransactionResponse> {
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    try {
      const tokenContract = new Contract(USDH_TOKEN_ADDRESS, erc20Abi, signer);
      const tx = await tokenContract.approve(TOKEN_GATEWAY_ADDRESS, ethers.MaxUint256);
      return tx;
    } catch (error: any) {
      console.error('Error approving USD.H token:', error);
      throw new Error(error.message || 'Failed to approve USD.H token');
    }
  }

  static async getEthBalance(address: string): Promise<string> {
    if (!provider) {
      throw new Error('Wallet not connected');
    }
    try {
      const balance = await provider.getBalance(address);
      return balance.toString();
    } catch (error: any) {
      console.error('Error fetching ETH balance:', error);
      return '0';
    }
  }

  static async dripFromFaucet(): Promise<ethers.TransactionResponse> {
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    try {
      const faucetContract = new Contract(FAUCET_ADDRESS, faucetAbi, signer);
      const tx = await faucetContract.drip(USDH_TOKEN_ADDRESS);
      return tx;
    } catch (error: any) {
      console.error('Error getting tokens from faucet:', error);
      throw new Error(error.message || 'Failed to get tokens from faucet');
    }
  }

  static async teleportToZkVerify(params: TeleportToZkVerifyParams): Promise<string> {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tokenGateway = new Contract(TOKEN_GATEWAY_ADDRESS, tokenGatewayAbi, signer);

      const recipientU8a = decodeAddress(params.recipient);
      const recipientHex = zeroPad(hexlify(recipientU8a), 32);

      const txParams = [
        ethers.parseEther(params.amount),
        0, // relayerFee
        TVFY_ASSET_ID,
        false, // redeem
        recipientHex,
        ZKVERIFY_DEST_BYTES,
        0, // timeout
        0, // nativeCost
        '0x', // data
      ];

      const tx = await tokenGateway.teleport(txParams);

      return tx.hash;
    } catch (error: any) {
      console.error('Error teleporting to zkVerify:', error);
      throw new Error(error.message || 'Failed to teleport to zkVerify');
    }
  }
} 