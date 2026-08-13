import { useState } from 'react';
import { ethers } from 'ethers';

const BOT_RECEIVING_ADDRESS = '0xf7009440356a5127889AA051E208CEDf646c049f';

const BOTS = [
  {
    id: 'Alpha',
    emoji: '🦾',
    accent: 'border-[#5b8a9a]',
    avatarBg: 'bg-[#d7ebf1]',
    delayClass: 'animate-desk-in-delay-1',
  },
  {
    id: 'Beta',
    emoji: '🤖',
    accent: 'border-[#c45c26]',
    avatarBg: 'bg-[#f6e2d4]',
    delayClass: 'animate-desk-in-delay-2',
  },
  {
    id: 'Gamma',
    emoji: '🛸',
    accent: 'border-[#2f4a3a]',
    avatarBg: 'bg-[#dde8df]',
    delayClass: 'animate-desk-in-delay-3',
  },
];

const INITIAL_LOGS = {
  Alpha: ['Desk online. Waiting for the Teacher...'],
  Beta: ['Desk online. Waiting for the Teacher...'],
  Gamma: ['Desk online. Waiting for the Teacher...'],
};

const INITIAL_STATUS = {
  Alpha: 'Waiting...',
  Beta: 'Waiting...',
  Gamma: 'Waiting...',
};

export default function App() {
  const [question, setQuestion] = useState('What is the meaning of life?');
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [winner, setWinner] = useState(null);
  const [asking, setAsking] = useState(false);
  const [isRealMoney, setIsRealMoney] = useState(false);

  const addLog = (botId, msg) => {
    setLogs((prev) => ({
      ...prev,
      [botId]: [...prev[botId], msg],
    }));
  };

  const setBotStatus = (botId, nextStatus) => {
    setStatus((prev) => ({ ...prev, [botId]: nextStatus }));
  };

  const askQuestion = async () => {
    const prompt = question.trim() || 'What is the meaning of life?';
    setAsking(true);
    setWinner(null);

    for (const bot of BOTS) {
      setBotStatus(bot.id, 'Calculating...');
      addLog(bot.id, `Teacher: "${prompt}"`);
      addLog(bot.id, 'Received question. Calculating...');
    }

    try {
      addLog('Beta', '🚧 Hit 402 Paywall! Bot Beta is demanding 2.00 USDC.');
      addLog('Beta', '✍️ Signing Base transaction off-chain...');

      let paymentSignature;

      if (isRealMoney) {
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

        addLog('Beta', `⏳ Waiting for confirmation... ${tx.hash}`);
        await tx.wait();
        addLog('Beta', `✅ Payment successful! Tx: ${tx.hash}`);
        paymentSignature = tx.hash;
      } else {
        addLog('Beta', '🧪 Test Mode: simulating off-chain signing (no real funds)...');
        await new Promise((r) => setTimeout(r, 1500));
        paymentSignature = `test-mode-${Date.now()}`;
        addLog('Beta', `✅ Simulated payment successful! Sig: ${paymentSignature}`);
      }

      const response = await fetch('http://localhost:3000/api/bot-beta/solve', {
        headers: {
          'PAYMENT-SIGNATURE': paymentSignature,
        },
      });

      if (response.ok) {
        const data = await response.json();
        addLog('Beta', `Answer unlocked: ${data.answer}`);
        setBotStatus('Beta', 'Answered!');
        setBotStatus('Alpha', 'Waiting...');
        setBotStatus('Gamma', 'Waiting...');
        addLog('Alpha', 'Beta got paid first. Sitting this one out.');
        addLog('Gamma', 'Beta got paid first. Sitting this one out.');
        setWinner(data.bot);
      } else {
        throw new Error(`API responded with ${response.status}`);
      }
    } catch (error) {
      addLog('Beta', `❌ Error: ${error.message}`);
      setBotStatus('Beta', 'Waiting...');
      setBotStatus('Alpha', 'Waiting...');
      setBotStatus('Gamma', 'Waiting...');
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="classroom-bg min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="animate-desk-in text-center">
          <p className="font-display text-4xl font-bold tracking-tight text-[var(--classroom-ink)] sm:text-5xl">
            Mr. x402&apos;s Math Class
          </p>
          <p className="mt-2 text-base text-[var(--classroom-chalk)] sm:text-lg">
            A digital classroom where bots settle answers with Base payments.
          </p>
        </header>

        <section className="animate-desk-in rounded-2xl border-b-4 border-[var(--classroom-wood)] bg-[var(--classroom-desk)] px-5 py-6 sm:px-8">
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f7f1e6] text-3xl"
              aria-hidden="true"
            >
              👨‍🏫
            </div>
            <div className="text-left">
              <h2 className="font-display text-xl font-bold text-[var(--classroom-ink)]">
                Teacher Desk
              </h2>
              <p className="text-sm text-[var(--classroom-chalk)]">
                Pose a question for the bot students.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div
              className="inline-flex w-fit items-center rounded-xl border-2 border-[var(--classroom-wood)]/30 bg-white p-1"
              role="group"
              aria-label="Payment mode"
            >
              <button
                type="button"
                onClick={() => setIsRealMoney(false)}
                disabled={asking}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  !isRealMoney
                    ? 'bg-[var(--classroom-chalk)] text-white'
                    : 'text-[var(--classroom-chalk)] hover:bg-[var(--classroom-desk)]'
                }`}
              >
                Test Mode
              </button>
              <button
                type="button"
                onClick={() => setIsRealMoney(true)}
                disabled={asking}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  isRealMoney
                    ? 'bg-[var(--classroom-accent)] text-white'
                    : 'text-[var(--classroom-chalk)] hover:bg-[var(--classroom-desk)]'
                }`}
              >
                Real Money
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type a question for the class..."
                className="min-w-0 flex-1 rounded-xl border-2 border-[var(--classroom-wood)]/35 bg-white px-4 py-3 text-base text-[var(--classroom-ink)] outline-none transition focus:border-[var(--classroom-accent)]"
              />
              <button
                type="button"
                onClick={askQuestion}
                disabled={asking}
                className="rounded-xl bg-[var(--classroom-accent)] px-6 py-3 text-base font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {asking ? 'Asking…' : 'Ask the Bots!'}
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {BOTS.map((bot) => {
            const isWinner = winner === bot.id;
            const isCalculating = status[bot.id] === 'Calculating...';

            return (
              <article
                key={bot.id}
                className={`${bot.delayClass} flex flex-col rounded-2xl border-2 bg-white/80 p-4 ${bot.accent} ${
                  isWinner ? 'ring-2 ring-[var(--classroom-accent)] ring-offset-2' : ''
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${bot.avatarBg}`}
                    aria-hidden="true"
                  >
                    {bot.emoji}
                  </div>
                  <div className="min-w-0 text-left">
                    <h3 className="font-display text-lg font-bold text-[var(--classroom-ink)]">
                      Bot {bot.id}
                    </h3>
                    <p
                      className={`text-sm font-semibold text-[var(--classroom-chalk)] ${
                        isCalculating ? 'animate-status-pulse' : ''
                      }`}
                    >
                      {isWinner ? 'Winner! (Paid 2 USDC)' : status[bot.id]}
                    </p>
                  </div>
                </div>

                <div className="font-mono-console flex h-56 flex-col gap-1 overflow-y-auto rounded-xl bg-[#1a2429] p-3 text-left text-xs leading-relaxed text-[#9ddec0] sm:h-64">
                  {logs[bot.id].map((log, i) => (
                    <div key={`${bot.id}-${i}`}>{`> ${log}`}</div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
