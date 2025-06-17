import React from 'react';
import './App.css';
import WalletConnect from './components/WalletConnect';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>zkVerify Remark Sender</h1>
        <p>Connect your wallet and send remarks to the zkVerify chain</p>
      </header>
      <main>
        <WalletConnect />
      </main>
    </div>
  );
}

export default App;
