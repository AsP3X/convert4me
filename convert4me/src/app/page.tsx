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
    <div className="bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Hero section with call to action */}
        <section className="py-12 md:py-16 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Transform Your Files <span className="text-blue-500">Effortlessly</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Convert files between formats with our intuitive tool. Fast, secure, and easy to use.
            </p>
          </div>
        </section>
        
        {/* File upload card */}
        <section className="mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Upload Files</h2>
              <FileUploader 
                onFileUpload={handleFileUpload} 
                acceptedFileTypes={supportedFormats}
              />
            </div>
          </div>
        </section>
        
        {/* File list section */}
        {files.length > 0 && (
          <section className="mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-6 md:p-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Your Files</h2>
                <div className="grid gap-6 md:grid-cols-2">
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
            </div>
          </section>
        )}

        {/* Features section */}
        <section className="mb-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Why Choose Convert4Me</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Our tool makes file conversion simple with these powerful features
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Fast Conversion</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Convert your files in seconds with our optimized processing engine
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Secure Processing</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your files are encrypted and automatically deleted after processing
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Multiple Formats</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Support for a wide range of file formats including video, audio, images, and documents
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 border-t border-gray-200 dark:border-gray-800 pt-8 pb-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                &copy; {new Date().getFullYear()} Convert4Me. All rights reserved.
              </p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                Terms
              </a>
              <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                Privacy
              </a>
              <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                Help
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
