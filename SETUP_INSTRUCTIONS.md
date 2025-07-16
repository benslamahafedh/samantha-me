# Samantha Voice Assistant - Setup Instructions

## Overview
This voice assistant now includes a bulletproof 3-minute session management system with Solana payment integration.

## Key Features
- **3-minute free trial** for each unique device/browser
- **Bulletproof session management** that persists across page refreshes
- **Solana wallet integration** for payments
- **Device fingerprinting** to prevent abuse
- **Automatic session termination** after 3 minutes

## Setup Steps

### 1. Environment Variables
Create a `.env.local` file in the root directory with the following:

```env
# OpenAI API Key (required)
OPENAI_API_KEY=your_openai_api_key_here

# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_PAYMENT_WALLET_ADDRESS=YOUR_ACTUAL_SOLANA_WALLET_ADDRESS_HERE
NEXT_PUBLIC_PAYMENT_AMOUNT_SOL=0.01
NEXT_PUBLIC_NETWORK=mainnet-beta
```

### 2. Configure Your Wallet Address
**IMPORTANT**: You must update the `NEXT_PUBLIC_PAYMENT_WALLET_ADDRESS` with your actual Solana wallet address where you want to receive payments.

### 3. Install Dependencies
The Solana wallet adapter packages have already been installed:
- @solana/web3.js
- @solana/wallet-adapter-react
- @solana/wallet-adapter-react-ui
- @solana/wallet-adapter-wallets
- @solana/wallet-adapter-base

### 4. Session Management Details

#### How It Works:
1. **First Visit**: Users get a 3-minute free trial
2. **Session Tracking**: Uses device fingerprinting and localStorage
3. **Timer Display**: Shows countdown in top-right corner
4. **Warnings**: Voice warnings at 60s, 30s, and 10s remaining
5. **Session End**: Automatic termination with payment modal

#### Session Data Structure:
- Unique device ID based on browser fingerprint
- Total time used (persists across sessions)
- Payment status
- Wallet address (if paid)
- Transaction ID (if paid)

### 5. Testing

#### Test Free Trial:
1. Open the app in a new browser/incognito window
2. Click the central orb to start
3. Watch the 3-minute countdown
4. Session will end automatically

#### Test Payment:
1. Use Phantom, Solflare, or other Solana wallets
2. Connect wallet when prompted
3. Approve the 0.01 SOL transaction
4. Enjoy unlimited access

### 6. Production Considerations

1. **RPC Endpoint**: Consider using a dedicated RPC endpoint for better performance
2. **Network**: Currently set to mainnet-beta, change to devnet for testing
3. **Price**: Adjust `NEXT_PUBLIC_PAYMENT_AMOUNT_SOL` as needed
4. **Session Duration**: Change `SESSION_DURATION` in `sessionManager.ts` (currently 180 seconds)

### 7. Security Features

- **Device Fingerprinting**: Prevents users from simply clearing cookies
- **Server-side Validation**: Add server-side payment verification for production
- **Session Expiry**: Sessions expire after 24 hours of inactivity
- **Secure Storage**: Session data encrypted in localStorage

### 8. Troubleshooting

**Session not starting?**
- Check browser console for errors
- Ensure microphone permissions are granted
- Try clearing localStorage and refreshing

**Payment not working?**
- Ensure wallet is connected to correct network
- Check wallet has sufficient SOL balance
- Verify correct wallet address in env variables

**Timer not showing?**
- Session must be started first
- Check for JavaScript errors in console

## Important Notes

1. **Replace the wallet address** in environment variables with your actual Solana wallet
2. **Test thoroughly** on devnet before deploying to mainnet
3. **Monitor API costs** - each session uses OpenAI API calls
4. **Consider rate limiting** on the API endpoint for additional protection

## Support

For issues or questions, please check:
- Browser console for errors
- Network tab for API failures
- Solana transaction status on explorer 