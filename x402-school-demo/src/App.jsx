import { useState } from 'react';
import { ethers } from 'ethers';

const BOT_RECEIVING_ADDRESS = '0xf7009440356a5127889AA051E208CEDf646c049f';

export default function App() {
  const [logs, setLogs] = useState(['System Ready. Waiting for Teacher...']);
  const [winner, setWinner] = useState(null);

  const addLog = (msg) => setLogs((prev) => [...prev, msg]);

  const askQuestion = async () => {
    addLog('Teacher: "What is the meaning of life?"');
    addLog('Bots are calculating...');

    try {
      addLog(`🚧 Hit 402 Paywall! Bot Beta is demanding 2.00 USDC.`);
      addLog(`✍️ Signing Base transaction off-chain...`);

      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
      const privateKey = import.meta.env.VITE_TEACHER_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('VITE_TEACHER_PRIVATE_KEY is not set');
      }

      const wallet = new ethers.Wallet(privateKey, provider);
      const tx = await wallet.sendTransaction({
        to: BOT_RECEIVING_ADDRESS,
        value: ethers.parseEther('0.0001'),
        gasLimit: 21000,
      });

      addLog(`⏳ Waiting for confirmation... ${tx.hash}`);
      await tx.wait();
      addLog(`✅ Payment successful! Tx: ${tx.hash}`);

      const response = await fetch('http://localhost:3000/api/bot-beta/solve', {
        headers: {
          'PAYMENT-SIGNATURE': tx.hash,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWinner(data.bot);
      } else {
        throw new Error(`API responded with ${response.status}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-blue-400 text-center">
          <h1 className="text-3xl font-bold mb-4">👨‍🏫 Mr. x402's Math Class</h1>
          <button 
            onClick={askQuestion}
            className="bg-blue-500 text-white px-8 py-4 rounded-full text-xl font-bold hover:bg-blue-600 transition"
          >
            Ask the Bots a Question!
          </button>
        </div>

        <div className="flex gap-4 justify-between">
          {['Alpha', 'Beta', 'Gamma'].map((bot) => (
            <div key={bot} className={`flex-1 p-6 rounded-2xl border-4 text-center ${winner === bot ? 'bg-green-200 border-green-500' : 'bg-gray-100 border-gray-300'}`}>
              <div className="text-4xl mb-2">🤖</div>
              <h2 className="text-xl font-bold">Bot {bot}</h2>
              {winner === bot && <p className="text-green-700 font-bold mt-2">Winner! (Paid 2 USDC)</p>}
            </div>
          ))}
        </div>

        <div className="bg-gray-900 rounded-xl p-6 shadow-inner h-64 overflow-y-auto font-mono text-green-400 text-sm flex flex-col gap-1">
          {logs.map((log, i) => (
            <div key={i}>{`> ${log}`}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
