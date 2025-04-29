// API client for the file converter application

export interface UploadedFile {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimetype: string;
  fileType: string;
  possibleOutputFormats: string[];
  uploadTimestamp?: number; // Optional to maintain backward compatibility
}

export interface ConversionJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  originalFilename: string;
  inputFormat: string;
  outputFormat: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

type ProgressCallback = (data: { jobId: string; progress: number }) => void;

class ApiClient {
  private eventSource: EventSource | null = null;
  private progressCallbacks: Map<string, ProgressCallback> = new Map();
  
  constructor() {
    // Initialize event source in browser only
    if (typeof window !== 'undefined') {
      this.connectEventSource();
    }
  }
  
  private connectEventSource() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    this.eventSource = new EventSource('/api/socket');
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.event === 'progress' && data.jobId && data.progress !== undefined) {
          // Call all registered callbacks
          this.progressCallbacks.forEach(callback => {
            callback({ jobId: data.jobId, progress: data.progress });
          });
        }
      } catch (error) {
        console.error('Error parsing event:', error);
      }
    };
    
    this.eventSource.onerror = () => {
      console.log('SSE connection error, reconnecting in 5s...');
      this.eventSource?.close();
      setTimeout(() => this.connectEventSource(), 5000);
    };
  }
  
  // Subscribe to real-time progress updates
  subscribeToProgress(callback: ProgressCallback) {
    const id = Math.random().toString(36).substring(2, 9);
    this.progressCallbacks.set(id, callback);
    
    // Return unsubscribe function
    return () => {
      this.progressCallbacks.delete(id);
    };
  }
  
  // Upload a file
  async uploadFile(file: File): Promise<UploadedFile> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error uploading file');
    }
    
    const data = await response.json();
    return data.file;
  }
  
  // Start a conversion
  async convertFile(
    filePath: string,
    outputFormat: string,
    options: Record<string, unknown> = {}
  ): Promise<{ jobId: string }> {
    const response = await fetch('/api/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath,
        outputFormat,
        options,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error starting conversion');
    }
    
    const data = await response.json();
    return { jobId: data.jobId };
  }
  
  // Get job status
  async getJobStatus(jobId: string): Promise<ConversionJob> {
    const response = await fetch(`/api/progress/${jobId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error getting job status');
    }
    
    const data = await response.json();
    return data.jobStatus;
  }
  
  // Cancel a conversion job
  async cancelJob(jobId: string): Promise<ConversionJob> {
    const response = await fetch(`/api/cancel/${jobId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error cancelling job');
    }
    
    const data = await response.json();
    return data.jobStatus;
  }
  
  // Get download URL
  getDownloadUrl(jobId: string): string {
    return `/api/download/${jobId}`;
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

export default apiClient; 