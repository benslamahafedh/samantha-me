'use client';

import { useState, useEffect } from 'react';

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

export default function SimpleAdminDashboard() {
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
    return new Date(dateString).toLocaleString();
  };

  const formatSOL = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return `${amount.toFixed(4)} SOL`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">💰 Samantha Admin Dashboard</h1>
          <p className="text-gray-400">Simple admin panel for SOL collection</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-gray-400 text-sm font-medium">Total Users</h3>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-gray-400 text-sm font-medium">Trial Users</h3>
              <p className="text-2xl font-bold text-yellow-400">{stats.trialUsers}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-gray-400 text-sm font-medium">Paid Users</h3>
              <p className="text-2xl font-bold text-green-400">{stats.paidUsers}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-gray-400 text-sm font-medium">Total Revenue</h3>
              <p className="text-2xl font-bold text-blue-400">{formatSOL(stats.totalRevenue)}</p>
            </div>
          </div>
        )}

        {/* SOL Collection Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">💸 Collect SOL Payments</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Your SOL Wallet Address (where to receive payments)
              </label>
              <input
                type="text"
                value={ownerWallet}
                onChange={(e) => setOwnerWallet(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Enter your SOL wallet address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                RPC URL (Solana network)
              </label>
              <input
                type="text"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                placeholder="https://api.mainnet-beta.solana.com"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useBatchMode}
                  onChange={(e) => setUseBatchMode(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-gray-400">Use Batch Mode (recommended for many users)</span>
              </label>
            </div>

            {useBatchMode && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Batch Size
                </label>
                <input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  min="1"
                  max="50"
                />
              </div>
            )}

            <button
              onClick={collectAllPayments}
              disabled={collecting || !ownerWallet}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-6 py-4 text-white font-bold text-lg transition-all duration-300"
            >
              {collecting ? '🔄 Collecting SOL...' : '💰 Collect All SOL Payments'}
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">👥 All Users ({users.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Session ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Wallet Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Payment Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {users.map((user, index) => (
                  <tr key={index} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                      {user.sessionId.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                      {user.walletAddress.substring(0, 8)}...{user.walletAddress.substring(user.walletAddress.length - 4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.isPaid 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {user.isPaid ? 'Paid' : 'Trial'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatSOL(user.amountReceived)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(user.paymentReceivedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(user.createdAt)}
                    </td>
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