import { web3Accounts, web3Enable, web3FromSource } from '@polkadot/extension-dapp';
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { ApiPromise, WsProvider } from '@polkadot/api';

const ZKVERIFY_WS_ENDPOINT = 'wss://volta-rpc.zkverify.io'; // zkVerify Volta network endpoint

export class WalletService {
  private static api: ApiPromise | null = null;
  
  static async connectApi(): Promise<ApiPromise> {
    if (!this.api) {
      try {
        const provider = new WsProvider(ZKVERIFY_WS_ENDPOINT);
        this.api = await ApiPromise.create({ provider });
        await this.api.isReady; // Wait for the API to be fully initialized
      } catch (error) {
        console.error('Failed to connect to chain:', error);
        throw new Error('Failed to connect to zkVerify chain. Please check if the node is running.');
      }
    }
    return this.api;
  }

  static async disconnect() {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
    }
  }

  static async checkWalletInstalled(): Promise<void> {
    const extensions = await web3Enable('zkverify-teleporter-dapp');
    if (!extensions || extensions.length === 0) {
      throw new Error('No Substrate wallet found. Please install a compatible wallet like Talisman or SubWallet.');
    }
  }

  static async getAccounts(): Promise<InjectedAccountWithMeta[]> {
    await this.checkWalletInstalled();
    
    const extensions = await web3Enable('zkverify_teleport');
    if (!extensions || extensions.length === 0) {
      throw new Error('No wallet extension found, or permission was denied. Please unlock your wallet and try again.');
    }

    const allAccounts = await web3Accounts();
    if (allAccounts.length === 0) {
      throw new Error('No accounts found. Please create or import an account in your wallet.');
    }

    return allAccounts;
  }

  static async getAccountBalance(address: string): Promise<string> {
    const api = await this.connectApi();
    try {
      const accountInfo = await api.query.system.account(address) as any;
      return accountInfo.data.free.toString();
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return '0';
    }
  }

  static async sendRemark(account: InjectedAccountWithMeta, remark: string): Promise<string> {
    await this.checkWalletInstalled();
    
    try {
      const api = await this.connectApi();
      
      const injector = await web3FromSource(account.meta.source);
      
      if (!injector || !injector.signer) {
        throw new Error('Wallet signer not found. Please make sure your wallet is unlocked.');
      }

      // Create the transaction
      const tx = api.tx.system.remark(remark);
      
      // Sign and send the transaction
      return new Promise((resolve, reject) => {
        tx.signAndSend(
          account.address,
          { signer: injector.signer },
          ({ status, events, dispatchError }) => {
            console.log('Transaction status:', status.type);
            
            if (status.isInBlock || status.isFinalized) {
              events.forEach(({ event }) => {
                if (api.events.system.ExtrinsicFailed.is(event)) {
                  reject(new Error('Transaction failed'));
                }
              });

              if (dispatchError) {
                reject(new Error(dispatchError.toString()));
              } else {
                resolve(tx.hash.toString());
              }
            }
          }
        ).catch((error) => {
          console.error('Transaction error:', error);
          reject(new Error('Failed to send transaction. Please check your wallet and try again.'));
        });
      });
    } catch (error: any) {
      console.error('Error in sendRemark:', error);
      throw new Error(error.message || 'Failed to send remark. Please check your wallet connection.');
    }
  }
} 