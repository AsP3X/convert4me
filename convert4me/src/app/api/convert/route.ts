import { NextRequest } from 'next/server';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { detectFileType, getPossibleOutputFormats, isConversionSupported } from '../utils/converters';
import { convertVideo } from '../utils/videoConverter';
import { convertImage } from '../utils/imageConverter';
import { convertDocument } from '../utils/documentConverter';
import { join } from 'path';
import { mkdir } from 'fs/promises';

// In-memory database for storing conversion jobs
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface ConversionJob {
  jobId: string;
  originalFilename: string;
  inputPath: string;
  outputPath?: string;
  inputFormat: string;
  outputFormat: string;
  status: JobStatus;
  progress: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

const conversionJobs = new Map<string, ConversionJob>();

export async function POST(request: NextRequest) {
  try {
    const { filePath, outputFormat, options } = await request.json();
    
    if (!filePath || !outputFormat) {
      return Response.json(
        { success: false, message: 'File path and output format are required' },
        { status: 400 }
      );
    }
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return Response.json(
        { success: false, message: 'File not found' },
        { status: 404 }
      );
    }
    
    // Get input format
    const inputFormat = detectFileType(filePath);
    
    // Check if conversion is supported
    if (!isConversionSupported(inputFormat, outputFormat)) {
      const possibleFormats = getPossibleOutputFormats(inputFormat);
      return Response.json(
        {
          success: false,
          message: `Conversion from ${inputFormat} to ${outputFormat} is not supported`,
          supportedFormats: possibleFormats
        },
        { status: 400 }
      );
    }
    
    // Ensure output directory exists
    const outputDir = join(process.cwd(), 'output');
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    
    // Create a unique job ID
    const jobId = uuidv4();
    const originalFilename = filePath.split('/').pop() || 'unknown';
    
    // Create conversion job record
    const conversionJob: ConversionJob = {
      jobId,
      originalFilename,
      inputPath: filePath,
      inputFormat,
      outputFormat,
      status: 'processing',
      progress: 0,
      createdAt: new Date()
    };
    
    // Save job to in-memory database
    conversionJobs.set(jobId, conversionJob);
    
    // Start conversion in background
    (async () => {
      try {
        // Define progress callback
        const progressCallback = (progress: number) => {
          const job = conversionJobs.get(jobId);
          if (job) {
            job.progress = progress;
            conversionJobs.set(jobId, job);
          }
        };
        
        // Determine which converter to use based on input format
        let outputPath: string;
        
        if (['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm'].includes(inputFormat)) {
          // Video conversion
          outputPath = await convertVideo(
            filePath, 
            outputFormat, 
            options, 
            progressCallback,
            jobId
          );
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'avif'].includes(inputFormat)) {
          // Image conversion
          outputPath = await convertImage(filePath, outputFormat, options, progressCallback);
        } else if (['pdf', 'docx'].includes(inputFormat)) {
          // Document handling
          outputPath = await convertDocument(filePath, outputFormat, options, progressCallback);
        } else {
          throw new Error(`Conversion for format ${inputFormat} is not implemented`);
        }
        
        // Update job with completed status
        const job = conversionJobs.get(jobId);
        if (job) {
          job.status = 'completed';
          job.progress = 100;
          job.outputPath = outputPath;
          job.completedAt = new Date();
          conversionJobs.set(jobId, job);
        }
      } catch (error) {
        console.error('Conversion error:', error);
        
        // Update job with failed status
        const job = conversionJobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.error = error instanceof Error ? error.message : 'Unknown error';
          conversionJobs.set(jobId, job);
        }
      }
    })();
    
    return Response.json({
      success: true,
      message: 'Conversion started',
      jobId
    });
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { success: false, message: 'Error starting conversion' },
      { status: 500 }
    );
  }
}

// Export conversion jobs for other routes to use
export { conversionJobs }; 