'use client';

import { useState, useEffect } from 'react';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';

interface PaymentStats {
  totalUsers: number;
  trialUsers: number;
  paidUsers: number;
  totalRevenue: number;
  recentPayments: any[];
}

interface User {
  sessionId: string;
  walletAddress: string;
  referenceId: string;
  isPaid: boolean;
  amountReceived: number | null;
  paymentReceivedAt: Date | null;
  createdAt: Date;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [ownerWallet, setOwnerWallet] = useState('');
  const [rpcUrl, setRpcUrl] = useState('https://api.mainnet-beta.solana.com');
  const [useBatchMode, setUseBatchMode] = useState(false);
  const [batchSize, setBatchSize] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      const statsResponse = await fetch('/api/admin/payments');
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Load all users
      const usersResponse = await fetch('/api/admin/users');
      const usersData = await usersResponse.json();
      setUsers(usersData.users || []);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const collectAllPayments = async () => {
    if (!ownerWallet) {
      alert('Please enter your wallet address first');
      return;
    }

    try {
      setCollecting(true);
      
      // Choose endpoint based on mode
      const endpoint = useBatchMode ? '/api/admin/collect-payments-batch' : '/api/admin/collect-payments';
      
      // Get all paid users with their private keys
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ownerWallet,
          rpcUrl,
          batchSize: useBatchMode ? batchSize : undefined
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const message = useBatchMode 
          ? `Successfully collected ${result.totalCollected} SOL from ${result.collectedCount}/${result.totalUsers} wallets (${result.successRate} success rate)!`
          : `Successfully collected ${result.totalCollected} SOL from ${result.collectedCount} wallets!`;
        alert(message);
        loadData(); // Refresh data
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to collect payments:', error);
      alert('Failed to collect payments');
    } finally {
      setCollecting(false);
    }
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatSOL = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0.0000 SOL';
    }
    return `${amount.toFixed(4)} SOL`;
  };

  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <p className="mt-4 text-white">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">💰 SOL Collection Dashboard</h1>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-gray-400 text-sm">Total Users</h3>
              <p className="text-2xl font-bold">{stats.totalUsers || 0}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-gray-400 text-sm">Trial Users</h3>
              <p className="text-2xl font-bold text-blue-400">{stats.trialUsers || 0}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-gray-400 text-sm">Paid Users</h3>
              <p className="text-2xl font-bold text-green-400">{stats.paidUsers || 0}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-gray-400 text-sm">Total Revenue</h3>
              <p className="text-2xl font-bold text-purple-400">{formatSOL(stats.totalRevenue)}</p>
            </div>
          </div>
        )}

        {/* Collection Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-semibold mb-4">🔄 Collect All Payments</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Your Wallet Address (to receive SOL)
              </label>
              <input
                type="text"
                value={ownerWallet}
                onChange={(e) => setOwnerWallet(e.target.value)}
                placeholder="Enter your Solana wallet address"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                RPC URL (optional)
              </label>
              <input
                type="text"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                placeholder="https://api.mainnet-beta.solana.com"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Collection Mode
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={useBatchMode}
                    onChange={(e) => setUseBatchMode(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Use Batch Mode (faster for 100+ users)</span>
                </label>
                {useBatchMode && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Batch Size</label>
                    <input
                      type="number"
                      value={batchSize}
                      onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                      min="5"
                      max="50"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-white text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={collectAllPayments}
            disabled={collecting || !ownerWallet}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 rounded-lg px-6 py-3 font-medium transition-all duration-300"
          >
            {collecting ? 'Collecting...' : '💰 Collect All SOL to Your Wallet'}
          </button>

          <div className="mt-4 text-sm text-gray-400">
            <p>• This will transfer all SOL from user wallets to your wallet</p>
            <p>• Each user wallet contains 0.0009 SOL after payment</p>
            <p>• Transaction fees will be deducted from each transfer</p>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-semibold mb-4">💳 Recent Payments</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2">Session ID</th>
                  <th className="text-left py-2">Wallet Address</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentPayments?.map((payment: any, index: number) => (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="py-2 font-mono text-xs">{payment.sessionId?.slice(0, 12) || 'N/A'}...</td>
                    <td className="py-2 font-mono text-xs">{payment.walletAddress?.slice(0, 12) || 'N/A'}...</td>
                    <td className="py-2 text-green-400">{formatSOL(payment.amountReceived)}</td>
                    <td className="py-2 text-gray-400">{payment.paymentReceivedAt ? formatDate(payment.paymentReceivedAt) : 'N/A'}</td>
                    <td className="py-2">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                        Paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* All Users */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">👥 All Users</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2">Session ID</th>
                  <th className="text-left py-2">Wallet Address</th>
                  <th className="text-left py-2">Reference ID</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: User, index: number) => (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="py-2 font-mono text-xs">{user.sessionId?.slice(0, 12) || 'N/A'}...</td>
                    <td className="py-2 font-mono text-xs">{user.walletAddress?.slice(0, 12) || 'N/A'}...</td>
                    <td className="py-2 font-mono text-xs">{user.referenceId?.slice(0, 12) || 'N/A'}...</td>
                    <td className="py-2">
                      {user.isPaid ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                          Trial
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-green-400">
                      {user.amountReceived ? formatSOL(user.amountReceived) : '-'}
                    </td>
                    <td className="py-2 text-gray-400">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 