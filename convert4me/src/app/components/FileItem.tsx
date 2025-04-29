import { useState } from 'react';
import { UploadedFile, ConversionJob } from '../lib/api';
import ProgressBar from './ProgressBar';

interface FileItemProps {
  file: UploadedFile;
  onConvert: (outputFormat: string) => void;
  conversionJob?: ConversionJob;
  onDownload?: () => void;
}

export default function FileItem({ file, onConvert, conversionJob, onDownload }: FileItemProps) {
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80">
      <div className="flex items-center mb-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3">
          <span className="text-xs font-semibold text-blue-800 dark:text-blue-200">
            {file.fileType.toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate" title={file.originalName}>
            {truncateFilename(file.originalName)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>

      {/* Conversion options */}
      {!conversionJob && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
            >
              {file.possibleOutputFormats.map((format) => (
                <option key={format} value={format}>
                  Convert to {format.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md text-sm transition-colors"
            onClick={() => onConvert(selectedFormat)}
          >
            Convert
          </button>
        </div>
      )}

      {/* Progress bar */}
      {conversionJob && (
        <div className="mt-3">
          <ProgressBar
            progress={conversionJob.progress}
            status={conversionJob.status}
          />
          
          {/* Download button */}
          {conversionJob.status === 'completed' && onDownload && (
            <button
              className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md text-sm transition-colors"
              onClick={onDownload}
            >
              Download {conversionJob.outputFormat.toUpperCase()}
            </button>
          )}
          
          {/* Error message */}
          {conversionJob.status === 'failed' && conversionJob.error && (
            <div className="mt-3 text-sm text-red-500 dark:text-red-400">
              Error: {conversionJob.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 