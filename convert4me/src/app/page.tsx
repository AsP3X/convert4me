'use client';

import { useState, useEffect, useCallback } from 'react';
import FileUploader from './components/FileUploader';
import FileItem from './components/FileItem';
import apiClient, { UploadedFile, ConversionJob } from './lib/api';

interface FileState {
  id: string;
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
    const uniqueId = `${uploadedFile.filename}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    setFiles((prevFiles) => [
      ...prevFiles,
      { 
        id: uniqueId,
        file: uploadedFile 
      },
    ]);
  }, []);

  // Handle file conversion
  const handleConvert = useCallback(async (fileState: FileState, outputFormat: string) => {
    try {
      const { jobId } = await apiClient.convertFile(
        fileState.file.path,
        outputFormat
      );
      
      // Update file state with initial job info and clear any previous job result
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === fileState.id
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
              f.id === fileState.id && f.conversionJob?.jobId === jobId
                ? {
                    ...f,
                    conversionJob: jobStatus,
                  }
                : f
            )
          );
          
          // Clear interval when job is completed, failed, or cancelled
          if (['completed', 'failed', 'cancelled'].includes(jobStatus.status)) {
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

  // Handle job cancellation
  const handleCancelJob = useCallback(async (jobId: string, fileId: string) => {
    try {
      const jobStatus = await apiClient.cancelJob(jobId);
      
      // Update file state with cancelled job info
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === fileId && f.conversionJob?.jobId === jobId
            ? {
                ...f,
                conversionJob: jobStatus,
              }
            : f
        )
      );
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <main className="container mx-auto py-10 px-4 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 text-blue-500">
            Convert4Me
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Transform your files with just a few clicks
          </p>
        </div>
        
        <div className="card mb-10 p-6">
          <FileUploader 
            onFileUpload={handleFileUpload} 
            acceptedFileTypes={supportedFormats}
          />
        </div>
        
        {files.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium mb-4 px-1">Your Files</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              {files.map((fileState) => (
                <FileItem
                  key={fileState.id}
                  file={fileState.file}
                  conversionJob={fileState.conversionJob}
                  onConvert={(outputFormat) => handleConvert(fileState, outputFormat)}
                  onDownload={
                    fileState.conversionJob?.status === 'completed'
                      ? () => handleDownload(fileState.conversionJob!.jobId)
                      : undefined
                  }
                  onCancel={
                    fileState.conversionJob?.status === 'processing'
                      ? () => handleCancelJob(fileState.conversionJob!.jobId, fileState.id)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}

        <footer className="mt-14 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Powered by Next.js and Tailwind CSS</p>
        </footer>
      </main>
    </div>
  );
}
