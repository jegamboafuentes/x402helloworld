import { useEffect, useMemo, useRef, useState } from 'react';
import { ethers } from 'ethers';

const SETTINGS_STORAGE_KEY = 'x402-school-demo-settings-v3';
const BLOCKED_TEACHER_ADDRESS = '0x2241af0E1E98923c6beb6C54c5f952bB5B1a9e74';

const EMPTY_SETTINGS = {
  cdpApiKeyId: '',
  cdpApiKeySecret: '',
  teacherPrivateKey: '',
  botReceivingAddress: '',
};

const BOTS = [
  {
    id: 'Beta',
    emoji: '🤖',
    accent: 'border-[#c45c26]',
    avatarBg: 'bg-[#f6e2d4]',
    delayClass: 'animate-desk-in-delay-1',
  },
];

const INITIAL_LOGS = {
  Beta: ['Desk online. Waiting for the Teacher...'],
};

const INITIAL_STATUS = {
  Beta: 'Waiting...',
};

const normalizePrivateKey = (key) => {
  const trimmed = (key || '').trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return '';
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
};

const deriveTeacherAddress = (privateKey) => {
  try {
    const key = normalizePrivateKey(privateKey);
    if (!key) return '';
    return new ethers.Wallet(key).address;
  } catch {
    return '';
  }
};

const addressesEqual = (a, b) => Boolean(a && b && a.toLowerCase() === b.toLowerCase());

const isBlockedTeacher = (privateKeyOrAddress) => {
  if (!privateKeyOrAddress) return false;
  if (addressesEqual(privateKeyOrAddress, BLOCKED_TEACHER_ADDRESS)) return true;
  return addressesEqual(deriveTeacherAddress(privateKeyOrAddress), BLOCKED_TEACHER_ADDRESS);
};

const sanitizeSettings = (value) => {
  const next = { ...EMPTY_SETTINGS, ...value };
  if (isBlockedTeacher(next.teacherPrivateKey)) {
    next.teacherPrivateKey = '';
  }
  return next;
};

const loadSettings = () => {
  try {
    const stale = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith('x402-school') && key !== SETTINGS_STORAGE_KEY) {
        stale.push(key);
      }
    }
    stale.forEach((key) => localStorage.removeItem(key));

    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...EMPTY_SETTINGS };
    const parsed = sanitizeSettings(JSON.parse(raw));
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return { ...EMPTY_SETTINGS };
  }
};

const inputClass =
  'w-full rounded-xl border-2 border-[var(--classroom-wood)]/35 bg-white px-3 py-2.5 font-mono text-sm text-[var(--classroom-ink)] outline-none transition focus:border-[var(--classroom-accent)]';

export default function App() {
  const [question, setQuestion] = useState('What is the meaning of life?');
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [winner, setWinner] = useState(null);
  const [asking, setAsking] = useState(false);
  const [isRealMoney, setIsRealMoney] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [draftSettings, setDraftSettings] = useState(EMPTY_SETTINGS);
  const [teacherKeyDraft, setTeacherKeyDraft] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const settingsRef = useRef(settings);

  useEffect(() => {
    const stored = loadSettings();
    setSettings(stored);
    setDraftSettings(stored);
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const teacherAddress = useMemo(
    () => deriveTeacherAddress(settings.teacherPrivateKey),
    [settings.teacherPrivateKey],
  );

  const credentialsReady = Boolean(
    settings.teacherPrivateKey.trim() && settings.botReceivingAddress.trim() && teacherAddress,
  );

  const addLog = (botId, msg) => {
    setLogs((prev) => ({
      ...prev,
      [botId]: [...prev[botId], msg],
    }));
  };

  const setBotStatus = (botId, nextStatus) => {
    setStatus((prev) => ({ ...prev, [botId]: nextStatus }));
  };

  const openSettings = () => {
    setDraftSettings({
      ...settings,
      teacherPrivateKey: '',
    });
    setTeacherKeyDraft('');
    setSettingsError('');
    setSettingsSaved(false);
    setShowSettings(true);
  };

  const saveSettings = () => {
    setSettingsError('');
    setSettingsSaved(false);

    const pastedKey = teacherKeyDraft.trim();
    if (!pastedKey) {
      setSettingsError('Paste your Teacher private key here. This app does not read .env and has no default wallet.');
      return;
    }

    if (isBlockedTeacher(pastedKey)) {
      setSettingsError('That key is the retired empty demo wallet (0x2241…9e74) and cannot be used. Paste the private key for your funded Base wallet.');
      return;
    }

    const address = deriveTeacherAddress(pastedKey);
    if (!address) {
      setSettingsError('Teacher private key is invalid. Paste a 64-character hex key.');
      return;
    }

    const next = {
      cdpApiKeyId: draftSettings.cdpApiKeyId.trim(),
      cdpApiKeySecret: draftSettings.cdpApiKeySecret.trim(),
      teacherPrivateKey: pastedKey,
      botReceivingAddress: draftSettings.botReceivingAddress.trim(),
    };

    if (next.botReceivingAddress && !ethers.isAddress(next.botReceivingAddress)) {
      setSettingsError('Bot receiving address is not a valid Ethereum address.');
      return;
    }

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    setSettings(next);
    setDraftSettings({ ...next, teacherPrivateKey: '' });
    setTeacherKeyDraft('');
    setSettingsSaved(true);
  };

  const clearSettings = () => {
    const stale = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith('x402-school')) stale.push(key);
    }
    stale.forEach((key) => localStorage.removeItem(key));
    setSettings({ ...EMPTY_SETTINGS });
    setDraftSettings({ ...EMPTY_SETTINGS });
    setTeacherKeyDraft('');
    setSettingsSaved(false);
    setSettingsError('');
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
        const currentSettings = settingsRef.current;
        const privateKey = normalizePrivateKey(currentSettings.teacherPrivateKey);
        const receivingAddress = currentSettings.botReceivingAddress.trim();

        if (!privateKey || !deriveTeacherAddress(privateKey)) {
          throw new Error('Open Settings and add your Teacher private key before using Real Money.');
        }
        if (!receivingAddress || !ethers.isAddress(receivingAddress)) {
          throw new Error('Open Settings and add a valid Bot receiving address before using Real Money.');
        }

        const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
        const wallet = new ethers.Wallet(privateKey, provider);
        if (isBlockedTeacher(wallet.address) || isBlockedTeacher(privateKey)) {
          throw new Error('Refusing retired demo wallet 0x2241…9e74. Open Settings and paste your funded wallet private key (not the .env key).');
        }
        const balance = await provider.getBalance(wallet.address);
        addLog('Beta', `Wallet: ${wallet.address}`);
        addLog('Beta', `Balance: ${ethers.formatEther(balance)} ETH`);
        addLog('Beta', `Paying bot at: ${receivingAddress}`);

        const tx = await wallet.sendTransaction({
          to: receivingAddress,
          value: ethers.parseEther('0.0001'),
          chainId: 8453,
          gasLimit: 21000,
          gasPrice: await provider.getFeeData().then((data) => data.gasPrice),
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
        setWinner(data.bot);
      } else {
        throw new Error(`API responded with ${response.status}`);
      }
    } catch (error) {
      addLog('Beta', `❌ Error: ${error.message}`);
      setBotStatus('Beta', 'Waiting...');
    } finally {
      setAsking(false);
    }
  };

  const updateDraft = (field) => (event) => {
    setDraftSettings((prev) => ({ ...prev, [field]: event.target.value }));
    setSettingsSaved(false);
  };

  return (
    <div className="classroom-bg min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="animate-desk-in relative text-center">
          <button
            type="button"
            onClick={openSettings}
            className="absolute right-0 top-0 rounded-xl border-2 border-[var(--classroom-wood)]/30 bg-white px-4 py-2 text-sm font-bold text-[var(--classroom-ink)] transition hover:border-[var(--classroom-accent)] hover:text-[var(--classroom-accent)]"
          >
            ⚙️ Settings
          </button>
          <p className="font-display text-4xl font-bold tracking-tight text-[var(--classroom-ink)] sm:text-5xl">
            Mr. x402&apos;s Math Class
          </p>
          <p className="mt-2 text-base text-[var(--classroom-chalk)] sm:text-lg">
            A digital classroom where bots settle answers with Base payments.
          </p>
        </header>

        <section className="animate-desk-in rounded-2xl border-b-4 border-[var(--classroom-wood)] bg-[var(--classroom-desk)] px-5 py-6 sm:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
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
                  Pose a question for Bot Beta.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openSettings}
              className="max-w-full rounded-lg bg-white/70 px-3 py-2 text-left font-mono text-xs text-[var(--classroom-chalk)] hover:bg-white"
            >
              {teacherAddress
                ? `Active wallet: ${teacherAddress}`
                : 'No wallet in Settings — click to add key'}
            </button>
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
                onClick={() => {
                  if (!credentialsReady) {
                    openSettings();
                    return;
                  }
                  setIsRealMoney(true);
                }}
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
                {asking ? 'Asking…' : 'Ask Bot Beta!'}
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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

          <aside className="animate-desk-in-delay-2 flex flex-col justify-between rounded-2xl border-2 border-[var(--classroom-wood)]/30 bg-white/80 p-6 text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--classroom-accent)]">
                About this project
              </p>
              <h3 className="font-display mt-2 text-2xl font-bold text-[var(--classroom-ink)]">
                x402 Agent School
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--classroom-chalk)]">
                A streamlined full-stack Web3 application demonstrating the x402 protocol, where an autonomous Teacher agent negotiates and settles Base network crypto microtransactions to securely unlock real-time Gemini AI answers from a smart student bot.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2 text-sm">
              <p>
                <span className="font-bold text-[var(--classroom-ink)]">Author: </span>
                <a
                  href="https://enriquegamboa.info"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--classroom-accent)] underline decoration-[var(--classroom-accent)]/40 underline-offset-2 hover:decoration-[var(--classroom-accent)]"
                >
                  Enrique Gamboa
                </a>
              </p>
              <p>
                <span className="font-bold text-[var(--classroom-ink)]">GitHub: </span>
                <a
                  href="https://github.com/jegamboafuentes/x402helloworld"
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-semibold text-[var(--classroom-accent)] underline decoration-[var(--classroom-accent)]/40 underline-offset-2 hover:decoration-[var(--classroom-accent)]"
                >
                  github.com/jegamboafuentes/x402helloworld
                </a>
              </p>
            </div>
          </aside>
        </section>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#1c2b33]/55 p-4 sm:items-center">
          <div className="my-4 w-full max-w-xl rounded-2xl border-b-4 border-[var(--classroom-wood)] bg-[var(--classroom-desk)] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-[var(--classroom-ink)]">
                  Demo Settings
                </h2>
                <p className="mt-1 text-sm text-[var(--classroom-chalk)]">
                  Keys stay in this browser only. They are not read from `.env` and are not sent to GitHub.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-lg px-3 py-1 text-lg font-bold text-[var(--classroom-chalk)] hover:bg-white/70"
                aria-label="Close settings"
              >
                ×
              </button>
            </div>

            <form
              className="flex flex-col gap-4 text-left"
              onSubmit={(event) => {
                event.preventDefault();
                saveSettings();
              }}
            >
              <fieldset className="rounded-xl bg-white/70 p-4">
                <legend className="px-1 text-sm font-bold text-[var(--classroom-ink)]">
                  Coinbase Developer Platform
                </legend>
                <label className="mt-2 block text-xs font-bold uppercase tracking-wide text-[var(--classroom-chalk)]">
                  CDP_API_KEY_ID
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={draftSettings.cdpApiKeyId}
                  onChange={updateDraft('cdpApiKeyId')}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={`mt-1 ${inputClass}`}
                />
                <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-[var(--classroom-chalk)]">
                  CDP_API_KEY_SECRET
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  value={draftSettings.cdpApiKeySecret}
                  onChange={updateDraft('cdpApiKeySecret')}
                  placeholder="Your CDP API secret"
                  className={`mt-1 ${inputClass}`}
                />
              </fieldset>

              <fieldset className="rounded-xl bg-white/70 p-4">
                <legend className="px-1 text-sm font-bold text-[var(--classroom-ink)]">
                  Teacher wallet (sender)
                </legend>
                <p className="mt-2 rounded-lg bg-[#dde8df] px-3 py-2 font-mono text-xs break-all text-[var(--classroom-ink)]">
                  {teacherAddress
                    ? `Currently saved wallet: ${teacherAddress}`
                    : 'No teacher wallet saved yet.'}
                </p>
                <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-[var(--classroom-chalk)]">
                  TEACHER_PRIVATE_KEY (paste to replace)
                </label>
                <textarea
                  autoComplete="off"
                  spellCheck="false"
                  name="x402-teacher-private-key-new"
                  rows={3}
                  value={teacherKeyDraft}
                  onChange={(event) => {
                    setTeacherKeyDraft(event.target.value);
                    setSettingsSaved(false);
                  }}
                  placeholder="Paste the private key from MetaMask for your funded Base wallet. Do not paste anything from .env."
                  className={`mt-1 resize-y ${inputClass}`}
                />
                <p className="mt-2 font-mono text-xs break-all text-[var(--classroom-chalk)]">
                  {teacherKeyDraft.trim()
                    ? isBlockedTeacher(teacherKeyDraft)
                      ? 'Blocked: this is the retired 0x2241…9e74 wallet. It will not be saved.'
                      : deriveTeacherAddress(teacherKeyDraft)
                        ? `This key will connect: ${deriveTeacherAddress(teacherKeyDraft)}`
                        : 'This key is invalid.'
                    : 'You must paste a private key and Save. .env is ignored and 0x2241…9e74 is never used.'}
                </p>
              </fieldset>

              <fieldset className="rounded-xl bg-white/70 p-4">
                <legend className="px-1 text-sm font-bold text-[var(--classroom-ink)]">
                  Bot receiving address
                </legend>
                <label className="mt-2 block text-xs font-bold uppercase tracking-wide text-[var(--classroom-chalk)]">
                  BOT_RECEIVING_ADDRESS
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={draftSettings.botReceivingAddress}
                  onChange={updateDraft('botReceivingAddress')}
                  placeholder="0x…"
                  className={`mt-1 ${inputClass}`}
                />
              </fieldset>

              {settingsError && (
                <p className="rounded-lg bg-[#f6e2d4] px-3 py-2 text-sm font-semibold text-[var(--classroom-accent)]">
                  {settingsError}
                </p>
              )}
              {settingsSaved && !settingsError && (
                <p className="rounded-lg bg-[#dde8df] px-3 py-2 text-sm font-semibold text-[var(--classroom-chalk)]">
                  Saved. Active teacher wallet is now {teacherAddress || 'unknown'}.
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={clearSettings}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-[var(--classroom-chalk)] hover:bg-white/70"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[var(--classroom-ink)]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--classroom-accent)] px-5 py-2 text-sm font-bold text-white hover:brightness-110"
                >
                  Save credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
