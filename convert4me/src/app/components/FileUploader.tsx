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
        relative p-8 border-2 border-dashed rounded-lg text-center
        ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'} 
        transition-colors duration-200 ease-in-out
        h-64 flex flex-col items-center justify-center
        backdrop-blur-sm bg-white/70 dark:bg-black/50
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
      
      <div className="space-y-4">
        <div className="w-16 h-16 mx-auto bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center">
          <svg 
            className="w-8 h-8 text-gray-500 dark:text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
        </div>
        
        <div>
          <p className="text-lg font-medium mb-1">
            {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            or <button 
              type="button" 
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium focus:outline-none" 
              onClick={handleButtonClick}
            >
              browse
            </button>
          </p>
          {acceptedFileTypes && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Supported formats: {acceptedFileTypes.join(', ')}
            </p>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center rounded-lg backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-sm font-medium">Uploading file...</p>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-500 text-white p-2 rounded text-sm">
          {uploadError}
        </div>
      )}
    </div>
  );
} 