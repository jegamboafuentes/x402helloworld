# 🏫 x402 Agent School MVP

An interactive, full-stack Web3 application demonstrating the power of the **x402 protocol**. This project visualizes a trustless, machine-to-machine economy where AI agents autonomously pay each other for computational resources and data using crypto.

In this "Hello World" MVP, a **Teacher Agent** asks a complex math question. Three **Bot Students** compute the answer, but lock it behind an HTTP 402 "Payment Required" paywall. The Teacher autonomously signs a real transaction on the Base network to pay the winner and unlock the answer.

## 📸 Screenshot

Error showing: ❌ Error: insufficient funds for intrinsic transaction cost

![App screenshot](https://github.com/jegamboafuentes/x402helloworld/blob/main/x402-school-demo/src/assets/notenoughfunds.png?raw=true)

## ✨ Features
* **Autonomous Machine Payments:** Demonstrates the HTTP 402 paywall interception and automated off-chain cryptographic signing.
* **Real Web3 Settlement:** Executes live transactions on the Base L2 network using `ethers.js`.
* **Visual Network Console:** A UI that logs the exact negotiation, paywall interception, and transaction hashes in real-time.
* **Lightweight Architecture:** Uses a fast Vite/React frontend and a Hono/Node.js backend.

---

## 🏗️ Architecture

* **Frontend (The Client):** React (Vite) + Tailwind CSS. Acts as the "Teacher" holding the funds and initiating the request.
* **Backend (The Server):** Node.js + Hono. Acts as the "Bots" holding the locked data and enforcing the x402 paywall.
* **Blockchain:** Base Network (Ethereum L2) for sub-cent, instant transaction settlements.

---

## 🚀 Getting Started

### Prerequisites
1. **Node.js** installed (v18+ recommended).
2. A **MetaMask** wallet (acting as the Teacher) funded with a small amount of ETH on the Base network.
3. A receiving wallet address (acting as the Bot).

### 1. Clone & Install
```bash
git clone [https://github.com/yourusername/x402-school-demo.git](https://github.com/yourusername/x402-school-demo.git)
cd x402-school-demo
npm install
```

### 2\. Environment Setup

Create a `.env` file in the root of the project and add your credentials:

Code snippet

```
# The Teacher's Wallet (Requires ETH on Base for gas/payment)
VITE_TEACHER_PRIVATE_KEY="0x_your_metamask_private_key"

# The Bot's Wallet (Where the funds will settle)
BOT_RECEIVING_ADDRESS="0x_your_receiving_public_address"
```

### 3\. Run the Application

You will need two terminal windows open to run the full-stack app.

**Terminal 1 (Backend Server):**

Bash

```
node server.js
```

*(Runs on `http://localhost:3000`)*

**Terminal 2 (Frontend UI):**

Bash

```
npm run dev
```

*(Runs on `http://localhost:5173`)*

Open your browser to `http://localhost:5173` and click **"Ask the Bots a Question!"** to watch the autonomous transaction flow.

## 🧠 How the x402 Flow Works in this Repo

1.  **The Request:** The React frontend makes a standard `GET` request to the Bot's API endpoint.
    
2.  **The Interception:** The Hono backend intercepts the request, returning an `HTTP 402 Payment Required` status along with the price and network requirements.
    
3.  **The Signature:** The frontend reads the 402 header, formats an `ethers.js` transaction, and uses the Teacher's private key to sign and broadcast the payment to the Base network.
    
4.  **The Settlement:** The frontend takes the transaction receipt, attaches it to the original request via a `PAYMENT-SIGNATURE` header, and fetches the final unlocked math answer.
    

## 🔮 Next Steps & Roadmap

-   \[ \] Swap the native ETH test transaction for the real `@x402/core` SDK and USDC ERC-20 token transfers.
    
-   \[ \] Implement Zero-Knowledge Proofs (ZK-SNARKs) so the Teacher can verify the Bot has the correct answer *before* paying.
    
-   \[ \] Break the monolithic `server.js` into distinct, competing backend instances.
