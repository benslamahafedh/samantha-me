# Solana Payment Setup for Samantha Voice Assistant

## 🚀 **Quick Setup Guide**

### **1. Get Solana RPC URL**
You can use any of these options:
- **Free**: `https://api.mainnet-beta.solana.com` (public RPC)
- **Helius**: `https://rpc.helius.xyz/?api-key=your-api-key` (recommended for production)
- **QuickNode**: `https://your-endpoint.solana-mainnet.quiknode.pro/your-api-key/`
- **Alchemy**: `https://solana-mainnet.g.alchemy.com/v2/your-api-key`

### **2. Environment Variables**
Add these to your `.env.local` file:

```env
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Solana RPC URL (choose one)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# OR for better performance:
# SOLANA_RPC_URL=https://rpc.helius.xyz/?api-key=your_helius_api_key_here

# App Owner Wallet Address (where all payments go)
OWNER_WALLET_ADDRESS=your_solana_wallet_address_here

# Your app's base URL
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### **3. Payment Flow**
- **Free Trial**: 3 minutes for all users
- **Paid Access**: 0.0009 SOL for 1 hour of unlimited access
- **No Wallet Required**: Users just send SOL to owner address
- **Instant Access**: Automatic access granted after payment confirmation

### **4. How It Works**
1. **User starts conversation** → Gets 3 minutes free trial
2. **Trial expires** → Payment modal appears
3. **User clicks "Generate Payment Address"** → Shows owner wallet address
4. **User sends SOL** → Polling detects payment (every 3 seconds)
5. **Access granted** → User gets 1 hour of unlimited access

## 🎯 **Technical Implementation**

### **Payment System**
- **Centralized**: All payments go to owner wallet address
- **Reference IDs**: Each payment gets unique tracking ID
- **Polling-based**: Checks owner wallet balance every 3 seconds
- **Real-time updates**: Shows payment progress in UI
- **Automatic access granting**: Upon sufficient payment

### **Payment Detection**
- **Balance monitoring**: Checks owner wallet balance
- **Real-time updates**: Shows payment progress in UI
- **Automatic access granting**: Upon sufficient payment
- **Session tracking**: Each payment session tracked separately

## 💡 **Benefits**

- **Non-Custodial**: Users control their own funds
- **No Wallet Setup**: Users don't need to connect wallets
- **Mobile Friendly**: Works with any Solana wallet
- **Instant Access**: No waiting for blockchain confirmations
- **Reliable**: Works with any Solana RPC provider
- **Cost Effective**: Lower fees than traditional payment processors
- **Simple Setup**: Works with public RPC or any provider

## 🧪 **Testing**

- Use Solana devnet for testing
- Test payments won't use real SOL
- Polling works the same in devnet mode
- Monitor payment progress in the UI

## 📱 **User Experience**

1. **Simple**: Just copy address and send SOL
2. **Fast**: Payment detection every 3 seconds
3. **Secure**: No personal data required
4. **Flexible**: Works with any Solana wallet
5. **Reliable**: Works with any RPC provider
6. **Progress Tracking**: See payment progress in real-time

## 🔗 **Integration Points**

- **Frontend**: `CryptoPaymentModal.tsx` - Payment UI with progress tracking
- **Backend**: `/api/create-payment` - Payment session creation
- **Polling**: `/api/check-payment` - Payment verification (every 3s)
- **Admin**: `/api/admin/payments` - Payment overview and analytics
- **Manager**: `paymentManager.ts` - Access control

## 📊 **Admin Dashboard**

Visit `/admin` to see:
- **Owner Wallet Balance**: Current SOL balance
- **Payment Statistics**: Total sessions, completed, pending, revenue
- **Recent Transactions**: Last 20 incoming/outgoing transactions
- **All Sessions**: Complete list of payment attempts with status

## ⚠️ **Important Notes**

- **Owner Wallet**: All payments go to your wallet address
- **Reference IDs**: Help track individual payments
- **RPC Provider**: Choose based on your needs (public is free, paid is faster)
- **Network**: Make sure you're on the same network (mainnet/devnet)

The system works with any Solana RPC provider - choose what works best for you! 