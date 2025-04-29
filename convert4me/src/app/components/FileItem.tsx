import { useState } from 'react';
import { UploadedFile, ConversionJob } from '../lib/api';
import ProgressBar from './ProgressBar';

interface FileItemProps {
  file: UploadedFile;
  onConvert: (outputFormat: string) => void;
  conversionJob?: ConversionJob;
  onDownload?: () => void;
  onCancel?: () => void;
}

export default function FileItem({ file, onConvert, conversionJob, onDownload, onCancel }: FileItemProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>(
    file.possibleOutputFormats.length > 0 ? file.possibleOutputFormats[0] : ''
  );

  // Helper function to truncate long filenames
  const truncateFilename = (filename: string, maxLength = 25) => {
    if (filename.length <= maxLength) return filename;
    
    const extension = filename.split('.').pop() || '';
    const name = filename.substring(0, filename.length - extension.length - 1);
    
    const truncatedName = name.substring(0, maxLength - extension.length - 3) + '...';
    return `${truncatedName}.${extension}`;
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // Only show conversion options for new files (files that never had a conversion job)
  const canShowConversionOptions = !conversionJob;

  return (
    <div className="card p-5 hover-effect">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-md flex items-center justify-center mr-3">
          <span className="text-xs font-semibold text-blue-500">
            {file.fileType.toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium truncate" title={file.originalName}>
            {truncateFilename(file.originalName)}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>

      {/* Conversion options - only shown for new files */}
      {canShowConversionOptions && (
        <div className="mt-4 space-y-3">
          <select
            className="block w-full rounded-md py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
          >
            {file.possibleOutputFormats.map((format) => (
              <option key={format} value={format}>
                Convert to {format.toUpperCase()}
              </option>
            ))}
          </select>
          
          <button
            className="w-full btn btn-primary py-2 px-4 rounded-md text-sm"
            onClick={() => onConvert(selectedFormat)}
          >
            Convert
          </button>
        </div>
      )}

      {/* Progress bar and status for active or completed conversions */}
      {conversionJob && (
        <div className="mt-4 space-y-3">
          <ProgressBar
            progress={conversionJob.progress}
            status={conversionJob.status}
          />
          
          {/* Cancel button for in-progress conversions */}
          {conversionJob.status === 'processing' && onCancel && (
            <button
              className="mt-3 w-full py-2 px-4 rounded-md text-sm bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
              onClick={onCancel}
            >
              Cancel Conversion
            </button>
          )}
          
          {/* Download button */}
          {conversionJob.status === 'completed' && onDownload && (
            <button
              className="mt-3 w-full py-2 px-4 rounded-md text-sm bg-green-500 hover:bg-green-600 text-white font-medium transition-colors"
              onClick={onDownload}
            >
              Download {conversionJob.outputFormat.toUpperCase()}
            </button>
          )}
          
          {/* Cancelled message */}
          {conversionJob.status === 'cancelled' && (
            <div className="mt-3 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-2 rounded-md">
              <p className="font-medium">Conversion cancelled</p>
              <p className="text-xs mt-1">Upload the file again to convert it.</p>
            </div>
          )}
          
          {/* Error message */}
          {conversionJob.status === 'failed' && conversionJob.error && (
            <div className="mt-3 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-md">
              <p className="font-medium">Conversion failed</p>
              <p className="text-xs mt-1">{conversionJob.error}</p>
              <p className="text-xs mt-1">Upload the file again to retry.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 