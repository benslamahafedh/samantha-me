# 🔐 Admin Dashboard Setup Guide

## 🚀 **Quick Setup**

### **1. Default Credentials**
The admin dashboard comes with default credentials:
- **Username**: `admin`
- **Password**: `samantha2024!`

### **2. Change Default Credentials (Recommended)**
Add these environment variables to your `.env.local` file:

```env
# Admin Dashboard Credentials
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password
```

### **3. Access Admin Dashboard**
1. **Go to**: `http://localhost:3000/admin` (or your domain/admin)
2. **Login**: Enter your credentials
3. **Access**: Full admin dashboard with SOL collection

## 🔒 **Security Features**

### **✅ Authentication System:**
- **Secure login**: Username/password authentication
- **Token-based**: JWT-like tokens with 24-hour expiration
- **Session management**: Automatic logout on token expiry
- **Protected routes**: All admin endpoints require authentication

### **🛡️ Security Measures:**
- **Environment variables**: Credentials stored securely
- **Token expiration**: Automatic cleanup of expired tokens
- **Input validation**: All inputs are validated
- **Error handling**: Secure error messages

## 📊 **Admin Dashboard Features**

### **💰 SOL Collection:**
- **View statistics**: Total users, revenue, payments
- **Collect payments**: Transfer SOL from user wallets to yours
- **Batch processing**: Optimized for 100+ users
- **Real-time updates**: Live payment tracking

### **👥 User Management:**
- **View all users**: Complete user database
- **Payment history**: Recent transactions
- **Session tracking**: Trial and paid user status
- **Analytics**: Revenue and user statistics

## 🚨 **Important Security Notes**

### **⚠️ Production Deployment:**
1. **Change default credentials** immediately
2. **Use strong passwords** (12+ characters, mixed case, symbols)
3. **Enable HTTPS** for secure transmission
4. **Regular credential rotation** (every 30-90 days)
5. **Monitor access logs** for suspicious activity

### **🔐 Best Practices:**
- **Unique credentials**: Don't reuse passwords
- **Environment variables**: Never hardcode credentials
- **Access control**: Limit admin access to trusted personnel
- **Backup security**: Secure your admin credentials

## 🛠️ **Troubleshooting**

### **Login Issues:**
- **Check credentials**: Verify username/password
- **Environment variables**: Ensure they're loaded correctly
- **Browser cache**: Clear cache and try again
- **Token issues**: Logout and login again

### **Access Issues:**
- **Token expired**: Automatic logout after 24 hours
- **Invalid token**: Clear localStorage and re-login
- **Network issues**: Check API connectivity

## 📝 **Example Environment Setup**

```env
# .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:3000
OPENAI_API_KEY=your_openai_key_here

# Admin Dashboard (CHANGE THESE!)
ADMIN_USERNAME=your_secure_admin_username
ADMIN_PASSWORD=YourSecurePassword123!

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## 🎯 **Quick Start Commands**

```bash
# Start development server
npm run dev

# Access admin dashboard
# Go to: http://localhost:3000/admin
# Login with: admin / samantha2024!

# Change credentials (add to .env.local)
ADMIN_USERNAME=myadmin
ADMIN_PASSWORD=MySecurePass123!
```

## 🔄 **Token Management**

### **Automatic Features:**
- **24-hour expiration**: Tokens expire automatically
- **Auto-cleanup**: Expired tokens are removed
- **Session persistence**: Stay logged in across browser sessions
- **Secure logout**: Complete session termination

### **Manual Management:**
- **Logout button**: Available in admin header
- **Clear localStorage**: Removes all tokens
- **Force logout**: Close browser or clear cache

---

**🔐 Your admin dashboard is now secure and ready to use!** 