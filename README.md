# zkVerify Remark Sender

A React application that allows users to connect their Talisman wallet and send system remarks to the zkVerify Volta network.

## Features

- Connect to Talisman wallet
- List available Talisman accounts
- Send system remarks to zkVerify Volta network
- Real-time transaction status updates
- Modern, responsive UI

## Prerequisites

- Node.js and npm installed
- [Talisman Wallet](https://www.talisman.xyz/) browser extension installed

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/zkverify-remark.git
cd zkverify-remark
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`.

## Usage

1. Make sure your Talisman wallet is installed and unlocked
2. Click "Connect Wallet" in the application
3. Select your account from the dropdown menu
4. Enter your remark in the text area
5. Click "Send Remark" to submit the transaction
6. Sign the transaction in your Talisman wallet when prompted

## Technical Details

- Built with React and TypeScript
- Uses Polkadot.js API for blockchain interaction
- Connects to zkVerify Volta network at `wss://volta-rpc.zkverify.io`
- Implements proper error handling and user feedback

## Dependencies

- @polkadot/api
- @polkadot/extension-dapp
- @polkadot/types
- @polkadot/util
- @polkadot/util-crypto
- React
- TypeScript

## Contributing

Feel free to submit issues and pull requests.

## License

MIT License
