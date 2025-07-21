'use client';

interface SessionTimerProps {
  timeLeft: number;
  isTrialActive: boolean;
  hasWalletAccess: boolean;
}

export default function SessionTimer({ timeLeft, isTrialActive, hasWalletAccess }: SessionTimerProps) {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (hasWalletAccess) {
      return 'Premium';
    } else if (isTrialActive) {
      return 'Trial';
    } else {
      return 'Expired';
    }
  };

  const getStatusColor = () => {
    if (hasWalletAccess) {
      return 'text-green-400';
    } else if (isTrialActive) {
      return timeLeft <= 30 ? 'text-red-400' : 'text-blue-400';
    } else {
      return 'text-gray-400';
    }
  };

  const getBgColor = () => {
    if (hasWalletAccess) {
      return 'bg-green-500/20 border-green-500/30';
    } else if (isTrialActive) {
      return timeLeft <= 30 ? 'bg-red-500/20 border-red-500/30' : 'bg-blue-500/20 border-blue-500/30';
    } else {
      return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  if (!isTrialActive && !hasWalletAccess) {
    return null; // Don't show timer if session is expired
  }

  return (
    <div className={`fixed top-4 right-4 ${getBgColor()} backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border`}>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${hasWalletAccess ? 'bg-green-400' : isTrialActive ? (timeLeft <= 30 ? 'bg-red-400' : 'bg-blue-400') : 'bg-gray-400'} ${isTrialActive ? 'animate-pulse' : ''}`}></div>
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {isTrialActive && (
          <span className={`text-xs font-mono ${timeLeft <= 30 ? 'text-red-400' : 'text-blue-400'}`}>
            {formatTime(timeLeft)}
          </span>
        )}
        {hasWalletAccess && (
          <span className="text-xs font-medium text-green-400">
            ∞
          </span>
        )}
      </div>
    </div>
  );
} 