'use client';

import { useState, useEffect, useCallback } from 'react';
import FileUploader from './components/FileUploader';
import FileItem from './components/FileItem';
import apiClient, { UploadedFile, ConversionJob } from './lib/api';

interface FileState {
  file: UploadedFile;
  conversionJob?: ConversionJob;
}

export default function Home() {
  const [files, setFiles] = useState<FileState[]>([]);
  const [supportedFormats, setSupportedFormats] = useState<string[]>([]);

  // Load supported formats
  useEffect(() => {
    // In a real app, we would fetch this from the backend
    // For now, let's hardcode some common formats
    setSupportedFormats([
      'mp4', 'mov', 'avi', 'mkv', 'webm',
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff',
      'pdf', 'docx',
      'mp3', 'wav'
    ]);
  }, []);

  // Subscribe to progress updates
  useEffect(() => {
    const unsubscribe = apiClient.subscribeToProgress((data) => {
      const { jobId, progress } = data;
      
      setFiles((prevFiles) => {
        return prevFiles.map((fileState) => {
          if (fileState.conversionJob?.jobId === jobId) {
            return {
              ...fileState,
              conversionJob: {
                ...fileState.conversionJob,
                progress,
              },
            };
          }
          return fileState;
        });
      });
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((uploadedFile: UploadedFile) => {
    setFiles((prevFiles) => [
      ...prevFiles,
      { file: uploadedFile },
    ]);
  }, []);

  // Handle file conversion
  const handleConvert = useCallback(async (fileState: FileState, outputFormat: string) => {
    try {
      const { jobId } = await apiClient.convertFile(
        fileState.file.path,
        outputFormat
      );
      
      // Update file state with initial job info
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.file.filename === fileState.file.filename
            ? {
                ...f,
                conversionJob: {
                  jobId,
                  status: 'processing',
                  progress: 0,
                  originalFilename: fileState.file.originalName,
                  inputFormat: fileState.file.fileType,
                  outputFormat,
                  createdAt: new Date(),
                },
              }
            : f
        )
      );
      
      // Start polling for job status
      const intervalId = setInterval(async () => {
        try {
          const jobStatus = await apiClient.getJobStatus(jobId);
          
          setFiles((prevFiles) =>
            prevFiles.map((f) =>
              f.file.filename === fileState.file.filename
                ? {
                    ...f,
                    conversionJob: jobStatus,
                  }
                : f
            )
          );
          
          // Clear interval when job is completed or failed
          if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error('Error polling job status:', error);
          clearInterval(intervalId);
        }
      }, 2000);
      
      return () => clearInterval(intervalId);
    } catch (error) {
      console.error('Conversion error:', error);
    }
  }, []);

  // Handle file download
  const handleDownload = useCallback((jobId: string) => {
    window.open(apiClient.getDownloadUrl(jobId), '_blank');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
            Convert4Me
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            The easy way to convert your files
          </p>
        </div>
        
        <div className="mb-8">
          <FileUploader 
            onFileUpload={handleFileUpload} 
            acceptedFileTypes={supportedFormats}
          />
        </div>
        
        {files.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Your Files</h2>
            
            {files.map((fileState) => (
              <FileItem
                key={fileState.file.filename}
                file={fileState.file}
                conversionJob={fileState.conversionJob}
                onConvert={(outputFormat) => handleConvert(fileState, outputFormat)}
                onDownload={
                  fileState.conversionJob?.status === 'completed'
                    ? () => handleDownload(fileState.conversionJob!.jobId)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
