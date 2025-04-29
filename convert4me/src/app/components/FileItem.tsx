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

  // Get file icon based on type
  const getFileIcon = () => {
    const type = file.fileType.toLowerCase();
    
    // Document types
    if (['pdf', 'doc', 'docx', 'txt'].includes(type)) {
      return (
        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    
    // Image types
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff'].includes(type)) {
      return (
        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    
    // Video types
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(type)) {
      return (
        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    
    // Audio types
    if (['mp3', 'wav', 'ogg', 'flac'].includes(type)) {
      return (
        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    }
    
    // Default file icon
    return (
      <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  };

  // Only show conversion options for new files (files that never had a conversion job)
  const canShowConversionOptions = !conversionJob;

  // Get target format (either selected or from conversion job)
  const targetFormat = conversionJob?.outputFormat || selectedFormat;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md relative">
      {/* Target format badge in upper right corner */}
      {targetFormat && (
        <div className="absolute top-3 right-3 flex items-center">
          <div className="flex items-center space-x-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full border border-blue-100 dark:border-blue-800/50 shadow-sm">
            <svg className="w-3.5 h-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <span>To {targetFormat.toUpperCase()}</span>
          </div>
        </div>
      )}
      
      <div className="p-5">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-4 border border-blue-100 dark:border-blue-800/30 shadow-sm relative">
            {getFileIcon()}
            <span className="absolute -bottom-1 -right-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 px-1 rounded-sm border border-blue-100 dark:border-blue-800/30">
              {file.fileType.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium text-gray-900 dark:text-white truncate" title={file.originalName}>
              {truncateFilename(file.originalName)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>

        {/* Conversion options - only shown for new files */}
        {canShowConversionOptions && (
          <div className="mt-5 space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <select
                className="block w-full rounded-lg py-2.5 pl-10 pr-10 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none transition-colors duration-200"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em'
                }}
              >
                {file.possibleOutputFormats.map((format) => (
                  <option key={format} value={format}>
                    Convert to {format.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all duration-200 ease-in-out"
              onClick={() => onConvert(selectedFormat)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Convert
            </button>
          </div>
        )}

        {/* Progress bar and status for active or completed conversions */}
        {conversionJob && (
          <div className="mt-5 space-y-4">
            <ProgressBar
              progress={conversionJob.progress}
              status={conversionJob.status}
            />
            
            <div className="flex flex-col mt-2 space-y-3">
              {/* Output format badge */}
              {(conversionJob.status === 'processing' || conversionJob.status === 'completed') && (
                <div className="inline-flex items-center self-start px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  {conversionJob.outputFormat.toUpperCase()}
                </div>
              )}
              
              {/* Cancel button for in-progress conversions */}
              {conversionJob.status === 'processing' && onCancel && (
                <button
                  className="inline-flex justify-center items-center py-2 px-4 rounded-lg text-sm bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 font-medium border border-red-200 dark:border-red-800/30 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
                  onClick={onCancel}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              )}
              
              {/* Download button */}
              {conversionJob.status === 'completed' && onDownload && (
                <button
                  className="inline-flex justify-center items-center py-2.5 px-4 rounded-lg text-sm bg-green-500 hover:bg-green-600 text-white font-medium transition-colors shadow-sm"
                  onClick={onDownload}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download {conversionJob.outputFormat.toUpperCase()}
                </button>
              )}
              
              {/* Cancelled message */}
              {conversionJob.status === 'cancelled' && (
                <div className="mt-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Conversion cancelled</span>
                  </div>
                  <p className="ml-7 text-xs mt-1">Upload the file again to convert it.</p>
                </div>
              )}
              
              {/* Error message */}
              {conversionJob.status === 'failed' && conversionJob.error && (
                <div className="mt-3 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg border border-red-100 dark:border-red-800/30">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-medium">Conversion failed</span>
                  </div>
                  <p className="ml-7 text-xs mt-1">{conversionJob.error}</p>
                  <p className="ml-7 text-xs mt-1">Upload the file again to retry.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 