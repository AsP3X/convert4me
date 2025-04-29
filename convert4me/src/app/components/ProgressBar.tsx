interface ProgressBarProps {
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export default function ProgressBar({ progress, status }: ProgressBarProps) {
  // Calculate styles based on status
  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'processing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300 dark:bg-gray-600';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'processing':
        return `Processing ${progress}%`;
      case 'pending':
        return 'Pending';
      default:
        return '';
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
      <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getStatusStyles()} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
} 