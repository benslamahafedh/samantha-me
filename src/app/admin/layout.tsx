'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      // Verify token is still valid
      verifyToken(adminToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('admin_token');
      }
    } catch (error) {
      localStorage.removeItem('admin_token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('admin_token', data.token);
        setIsAuthenticated(true);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    router.push('/admin');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">🔐 Admin Access</h1>
              <p className="text-gray-400">Enter your credentials to access the admin dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Enter password"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg px-6 py-3 text-white font-medium transition-all duration-300"
              >
                🔑 Login to Admin Panel
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                This area is restricted to authorized personnel only.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Admin Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">💰 Samantha Admin Dashboard</h1>
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
              Authenticated
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 rounded-lg px-4 py-2 text-white text-sm font-medium transition-colors"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Admin Content */}
      <div className="p-8">
        {children}
      </div>
    </div>
  );
} 