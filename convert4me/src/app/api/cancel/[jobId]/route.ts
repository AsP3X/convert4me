import { NextRequest } from 'next/server';
import { conversionJobs } from '../../convert/route';
import { activeConversionProcesses } from '../../utils/videoConverter';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';

// Helper function to delete a file and handle errors
async function deleteFile(filePath: string): Promise<boolean> {
  try {
    if (existsSync(filePath)) {
      await unlink(filePath);
      console.log(`Deleted file: ${filePath}`);
      return true;
    } else {
      console.log(`File not found for deletion: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { jobId: string } }
) {
  try {
    // Access the jobId param
    const { jobId } = await context.params;
    
    if (!jobId) {
      return Response.json(
        { success: false, message: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    // Get job from in-memory storage
    const job = conversionJobs.get(jobId);
    
    if (!job) {
      return Response.json(
        { success: false, message: `Job with ID ${jobId} not found` },
        { status: 404 }
      );
    }
    
    // Check if job is already completed, failed, or cancelled
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return Response.json(
        { 
          success: false, 
          message: `Job is already ${job.status}` 
        },
        { status: 400 }
      );
    }
    
    // Try to find and kill the active process
    const process = activeConversionProcesses.get(jobId);
    let processKilled = false;
    
    if (process) {
      try {
        // Kill the process
        process.kill();
        activeConversionProcesses.delete(jobId);
        processKilled = true;
      } catch (error) {
        console.error(`Error killing process for job ${jobId}:`, error);
      }
    }
    
    // Update job status
    job.status = 'cancelled';
    // Don't set an error message for cancellations
    conversionJobs.set(jobId, job);
    
    // Delete the source file
    const inputPath = job.inputPath;
    const fileDeleted = await deleteFile(inputPath);
    
    return Response.json({
      success: true,
      message: processKilled 
        ? 'Conversion cancelled successfully' 
        : 'Job marked as cancelled, but process was not found',
      fileDeleted,
      jobStatus: {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        originalFilename: job.originalFilename,
        inputFormat: job.inputFormat,
        outputFormat: job.outputFormat,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }
    });
  } catch (error) {
    console.error('Error cancelling job:', error);
    return Response.json(
      { success: false, message: 'Error cancelling job' },
      { status: 500 }
    );
  }
} 