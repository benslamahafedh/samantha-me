# Anonymous Payment System for Samantha Voice Assistant

## 🎯 **System Overview**

This is a complete backend system for anonymous users with trial access and SOL payments. Users get 3 minutes free trial, then must pay 0.0009 SOL for 1 hour of unlimited access.

## 🏗️ **Architecture**

### **Core Components**
- **Database Layer**: In-memory storage (replace with PostgreSQL/MongoDB in production)
- **Session Manager**: Handles anonymous user sessions and access control
- **Payment System**: Individual Solana addresses per user
- **Webhook Processing**: Real-time payment detection
- **Admin Dashboard**: Complete payment analytics

### **Data Flow**
1. **User visits** → Anonymous session created with UUID
2. **3-minute trial** → Full access during trial period
3. **Trial expires** → Payment modal with unique Solana address
4. **User pays** → Webhook/polling detects payment
5. **Access granted** → 1 hour of unlimited access

## 📊 **Database Schema**

```typescript
interface AnonymousUser {
  sessionId: string;           // Unique session identifier
  walletAddress: string;       // Individual Solana address
  privateKey: string;          // Base64 encoded private key
  createdAt: Date;            // Session creation time
  trialExpiresAt: Date;       // Trial expiration (3 minutes)
  isPaid: boolean;            // Payment status
  txId: string | null;        // Transaction ID
  amountReceived: number | null; // Amount received in SOL
  paymentReceivedAt: Date | null; // Payment timestamp
  accessExpiresAt: Date | null;   // Paid access expiration (1 hour)
  referenceId: string;        // Unique reference for tracking
}
```

## 🔧 **API Endpoints**

### **Session Management**
- `POST /api/session` - Create or retrieve session
- `GET /api/session?sessionId=xxx` - Check session status

### **Payment System**
- `POST /api/create-payment` - Generate payment address
- `POST /api/check-payment` - Check payment status (polling)
- `POST /api/payment-webhook` - Process payment webhooks
- `POST /api/verify-payment` - Manual payment verification

### **Session Recovery**
- `POST /api/session-recovery` - Recover lost session

### **Admin**
- `GET /api/admin/payments` - Payment analytics
- `/admin` - Admin dashboard

## 🚀 **Quick Start**

### **1. Environment Setup**
```env
# Solana RPC (choose one)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# OR
HELIUS_RPC_URL=https://rpc.helius.xyz/?api-key=your-api-key

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# App URL
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### **2. Frontend Integration**

```typescript
// Create or get session
const response = await fetch('/api/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId: localStorage.getItem('sessionId') })
});

const { sessionId, hasAccess, reason } = await response.json();

// Store session ID
localStorage.setItem('sessionId', sessionId);

// Check if payment needed
if (!hasAccess) {
  // Show payment modal
  showPaymentModal(sessionId);
}
```

### **3. Payment Flow**

```typescript
// Generate payment address
const paymentResponse = await fetch('/api/create-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId })
});

const { paymentAddress, referenceId, amount } = await paymentResponse.json();

// Display QR code and address
showPaymentUI(paymentAddress, referenceId, amount);

// Poll for payment
const pollInterval = setInterval(async () => {
  const checkResponse = await fetch('/api/check-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  
  const { hasAccess } = await checkResponse.json();
  if (hasAccess) {
    clearInterval(pollInterval);
    // Grant access
  }
}, 3000);
```

## 🔒 **Security Features**

### **Session Security**
- **UUID-based sessions**: Cryptographically secure session IDs
- **No personal data**: Completely anonymous
- **Session expiration**: Automatic cleanup of expired sessions
- **Reference IDs**: Unique tracking for each payment

### **Payment Security**
- **Individual addresses**: Each user gets unique Solana address
- **Private key storage**: Securely stored on backend
- **Amount verification**: Ensures minimum payment amount
- **Transaction tracking**: Full audit trail

### **Access Control**
- **Trial limits**: 3-minute free trial per session
- **Paid access**: 1-hour unlimited access after payment
- **Automatic expiration**: Access revoked after time limit
- **Session validation**: All requests validated

## 📱 **User Experience**

### **Trial Period**
1. **First visit** → Anonymous session created
2. **3 minutes free** → Full access to Samantha
3. **Trial expires** → Payment modal appears
4. **Unique address** → Individual Solana address shown
5. **QR code** → Easy mobile payment

### **Payment Process**
1. **Copy address** → User copies Solana address
2. **Send SOL** → User sends 0.0009 SOL from any wallet
3. **Real-time detection** → Payment detected via polling/webhook
4. **Instant access** → 1 hour of unlimited access granted
5. **Session recovery** → Can recover session if lost

### **Session Recovery**
- **Lost session ID** → Can recover via wallet address
- **Bookmark feature** → Save session ID for later
- **Multiple identifiers** → Session ID, wallet address, reference ID

## 🛠️ **Development Features**

### **Admin Dashboard**
- **Real-time stats**: Total users, trial users, paid users
- **Revenue tracking**: Total SOL received
- **Session management**: View all user sessions
- **Payment history**: Complete transaction log

### **Debugging Tools**
- **Manual verification**: Check payment status manually
- **Session recovery**: Recover lost sessions
- **Payment testing**: Test payment flow
- **Logging**: Comprehensive console logging

### **Monitoring**
- **Payment detection**: Both webhook and polling methods
- **Session tracking**: Complete user journey
- **Error handling**: Graceful error recovery
- **Performance**: Optimized for real-time updates

## 🔄 **Payment Detection Methods**

### **1. Polling (Default)**
- **Frequency**: Every 3 seconds
- **Method**: Check wallet balance
- **Pros**: Works with any RPC, no setup required
- **Cons**: Slight delay, more API calls

### **2. Webhooks (Optional)**
- **Provider**: Helius, QuickNode, etc.
- **Method**: Real-time notifications
- **Pros**: Instant detection, fewer API calls
- **Cons**: Requires webhook setup

### **3. Manual Verification**
- **Endpoint**: `/api/verify-payment`
- **Use case**: Debugging, manual checks
- **Method**: Direct balance check

## 📈 **Analytics & Monitoring**

### **User Metrics**
- **Total sessions**: All anonymous users
- **Trial conversions**: Users who paid after trial
- **Payment success rate**: Successful payments
- **Session duration**: Average session length

### **Revenue Metrics**
- **Total revenue**: SOL received
- **Payment amounts**: Individual payment tracking
- **Conversion funnel**: Trial → Payment → Access
- **Revenue trends**: Over time analysis

### **System Health**
- **API response times**: Performance monitoring
- **Error rates**: System reliability
- **Payment detection**: Success/failure rates
- **Session cleanup**: Maintenance metrics

## 🚨 **Edge Cases Handled**

### **Session Loss**
- **Cleared cookies** → Session recovery via wallet address
- **Browser change** → Can recover with session ID
- **Device change** → Multiple recovery methods

### **Payment Issues**
- **Insufficient amount** → Clear error messages
- **Wrong address** → Reference ID tracking
- **Network issues** → Fallback polling
- **Transaction delays** → Real-time status updates

### **System Failures**
- **RPC downtime** → Multiple RPC fallbacks
- **Database issues** → In-memory storage
- **Webhook failures** → Polling fallback
- **Session corruption** → Automatic cleanup

## 🔧 **Production Considerations**

### **Database Migration**
```sql
-- PostgreSQL schema
CREATE TABLE anonymous_users (
  session_id VARCHAR(255) PRIMARY KEY,
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  private_key TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  trial_expires_at TIMESTAMP NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  tx_id VARCHAR(255),
  amount_received DECIMAL(20,9),
  payment_received_at TIMESTAMP,
  access_expires_at TIMESTAMP,
  reference_id VARCHAR(255) UNIQUE NOT NULL
);

CREATE INDEX idx_wallet_address ON anonymous_users(wallet_address);
CREATE INDEX idx_reference_id ON anonymous_users(reference_id);
CREATE INDEX idx_created_at ON anonymous_users(created_at);
```

### **Security Enhancements**
- **Private key encryption**: Encrypt stored private keys
- **Rate limiting**: Prevent abuse
- **Input validation**: Sanitize all inputs
- **CORS configuration**: Secure API access

### **Scalability**
- **Database indexing**: Optimize queries
- **Caching**: Redis for session data
- **Load balancing**: Multiple RPC endpoints
- **Monitoring**: APM and logging

## 🎯 **Benefits**

### **For Users**
- ✅ **No signup required**: Completely anonymous
- ✅ **No wallet connection**: Just send SOL
- ✅ **Mobile friendly**: QR code payments
- ✅ **Session recovery**: Multiple recovery methods
- ✅ **Instant access**: Real-time payment detection

### **For Developers**
- ✅ **Simple integration**: Clean API design
- ✅ **Flexible deployment**: Works with any RPC
- ✅ **Comprehensive monitoring**: Full analytics
- ✅ **Edge case handling**: Robust error recovery
- ✅ **Production ready**: Scalable architecture

### **For Business**
- ✅ **Revenue tracking**: Complete payment analytics
- ✅ **User insights**: Trial conversion metrics
- ✅ **Cost effective**: Low transaction fees
- ✅ **Global access**: Works worldwide
- ✅ **No chargebacks**: Crypto payments

This system provides a complete solution for anonymous trial access with SOL payments, handling all edge cases and providing comprehensive monitoring and analytics. 