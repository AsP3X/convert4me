import { useState, useRef, useCallback } from 'react';
import apiClient, { UploadedFile } from '../lib/api';

interface FileUploaderProps {
  onFileUpload: (file: UploadedFile) => void;
  acceptedFileTypes?: string[];
}

export default function FileUploader({ onFileUpload, acceptedFileTypes }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptValue = acceptedFileTypes ? acceptedFileTypes.map(type => `.${type}`).join(',') : undefined;

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      
      // Reset the file input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const handleFiles = async (files: FileList) => {
    try {
      setIsUploading(true);
      setUploadError(null);
      
      // For now, just handle the first file
      const file = files[0];
      const result = await apiClient.uploadFile(file);
      onFileUpload(result);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div 
      className={`
        relative p-10 text-center border-2 border-dashed rounded-xl
        transition-all duration-300 ease-in-out 
        ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 scale-[1.02]' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/20'}
        h-72 flex flex-col items-center justify-center
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileInputChange}
        accept={acceptValue}
      />
      
      <div className="space-y-6">
        <div className="w-20 h-20 mx-auto bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700 shadow-md transform transition-transform duration-300 hover:scale-110">
          <svg 
            className={`w-10 h-10 text-blue-500 transition-all duration-300 ${isDragging ? 'scale-110' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
        </div>
        
        <div className="space-y-3">
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
          </p>
          <p className="text-base text-gray-600 dark:text-gray-400">
            or{' '}
            <button 
              type="button" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all duration-200 ease-in-out hover:shadow-md mx-1"
              onClick={handleButtonClick}
            >
              Browse files
            </button>
          </p>
          {acceptedFileTypes && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
              Supported formats: <span className="font-medium">{acceptedFileTypes.join(', ')}</span>
            </p>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 flex items-center justify-center rounded-xl backdrop-blur-sm transition-opacity duration-300">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-500 rounded-full animate-spin shadow-md"></div>
            <p className="mt-4 text-base font-medium text-gray-800 dark:text-gray-200">Uploading file...</p>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg text-sm font-medium shadow-lg animate-fadeIn">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {uploadError}
          </div>
        </div>
      )}
    </div>
  );
} 