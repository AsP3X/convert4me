import { NextRequest } from 'next/server';
import { conversionJobs } from '../../convert/route';

export async function GET(
  request: NextRequest,
  context: { params: { jobId: string } }
) {
  try {
    // Access the jobId param following Next.js 15 standards
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
    
    return Response.json({
      success: true,
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
    console.error('Error getting job status:', error);
    return Response.json(
      { success: false, message: 'Error retrieving job status' },
      { status: 500 }
    );
  }
} 