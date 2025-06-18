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

  static async checkWalletInstalled(): Promise<boolean> {
    // Check specifically for Talisman
    const injectedWindow = window as any;
    if (!injectedWindow.injectedWeb3 || !injectedWindow.injectedWeb3['talisman']) {
      throw new Error('Talisman wallet not found. Please install Talisman from https://www.talisman.xyz/');
    }
    return true;
  }

  static async getAccounts(): Promise<InjectedAccountWithMeta[]> {
    await this.checkWalletInstalled();
    
    // First enable Talisman specifically
    const extensions = await web3Enable('zkverify-remark');
    const talisman = extensions.find((ext) => ext.name === 'talisman');

    if (!talisman) {
      throw new Error('Failed to connect to Talisman. Please unlock your wallet and try again.');
    }

    // Get all accounts
    const allAccounts = await web3Accounts();
    if (allAccounts.length === 0) {
      throw new Error('No accounts found in Talisman. Please create or import an account.');
    }

    // Filter for Talisman accounts only
    const talismanAccounts = allAccounts.filter(acc => acc.meta.source === 'talisman');
    if (talismanAccounts.length === 0) {
      throw new Error('No Talisman accounts found. Please create or import an account in Talisman.');
    }

    return talismanAccounts;
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
      
      // Get the Talisman signer
      const injector = await web3FromSource('talisman');
      
      if (!injector || !injector.signer) {
        throw new Error('Talisman signer not found. Please make sure Talisman is unlocked.');
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