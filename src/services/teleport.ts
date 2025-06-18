import { ApiPromise } from '@polkadot/api';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { web3FromSource } from '@polkadot/extension-dapp';
import { hexToU8a } from '@polkadot/util';

export interface TeleportParams {
  assetId: number;
  destination: 'Evm';
  chainId: number;
  recipient: string;
  amount: string;
  timeout: number;
  relayerFee: string;
  redeem: boolean;
}

// Sepolia token gateway address
const TOKEN_GATEWAY = '0xFcDa26cA021d5535C3059547390E6cCd8De7acA6';

export class TeleportService {
  static async teleportToEvm(
    api: ApiPromise,
    account: InjectedAccountWithMeta,
    params: TeleportParams
  ): Promise<string> {
    try {
      const injector = await web3FromSource(account.meta.source);
      
      if (!injector || !injector.signer) {
        throw new Error('No signer found. Please make sure your wallet is unlocked.');
      }

      // Remove '0x' prefix if present and ensure the address is 40 characters (20 bytes)
      const cleanRecipient = params.recipient.toLowerCase().replace('0x', '').padStart(40, '0');
      // Convert to proper 32-byte format by padding with zeros at the start
      const paddedRecipient = '000000000000000000000000' + cleanRecipient;

      // Clean the token gateway address, it should be a 20-byte address
      const cleanGateway = TOKEN_GATEWAY.toLowerCase().replace('0x', '');

      // Create the teleport request object according to the chain's format
      const teleportRequest = {
        asset_id: params.assetId,
        destination: {
          Evm: params.chainId
        },
        recepient: '0x' + paddedRecipient, // Pass as 32-byte hex string
        amount: params.amount,
        timeout: params.timeout,
        token_gateway: '0x' + cleanGateway, // Pass as 20-byte hex string
        relayer_fee: params.relayerFee,
        call_data: null, // Optional parameter required by the chain
        redeem: params.redeem
      };

      console.log('Teleport request:', teleportRequest);

      // Create the transaction with a single object parameter
      const tx = api.tx.tokenGateway.teleport(teleportRequest);

      // Sign and send the transaction
      return new Promise((resolve, reject) => {
        tx.signAndSend(
          account.address,
          { signer: injector.signer },
          ({ status, events, dispatchError }) => {
            console.log('Teleport status:', status.type);
            
            if (status.isInBlock || status.isFinalized) {
              events.forEach(({ event }) => {
                if (api.events.system.ExtrinsicFailed.is(event)) {
                  reject(new Error('Teleport transaction failed'));
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
          console.error('Teleport error:', error);
          reject(new Error('Failed to send teleport transaction. Please check your wallet and try again.'));
        });
      });
    } catch (error: any) {
      console.error('Error in teleport:', error);
      throw new Error(error.message || 'Failed to teleport. Please check your wallet connection.');
    }
  }

  // Helper function to format amount with 18 decimals
  static formatAmount(amount: string): string {
    // Remove any existing decimals and non-numeric characters
    const cleanAmount = amount.replace(/[^\d.]/g, '');
    const parts = cleanAmount.split('.');
    
    if (parts.length === 1) {
      // No decimal point, add 18 zeros
      return parts[0] + '000000000000000000';
    } else {
      // Has decimal point, pad to 18 decimals
      const decimals = parts[1].slice(0, 18).padEnd(18, '0');
      return parts[0] + decimals;
    }
  }
} 