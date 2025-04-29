import { NextRequest } from 'next/server';
import { conversionJobs } from '../../convert/route';
import { existsSync, readFileSync } from 'fs';
import { basename, extname } from 'path';

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
    
    // Check if conversion is completed
    if (job.status !== 'completed') {
      return Response.json(
        { 
          success: false, 
          message: `Conversion job is ${job.status}`,
          progress: job.progress
        },
        { status: 400 }
      );
    }
    
    // Check if output file exists
    if (!job.outputPath || !existsSync(job.outputPath)) {
      return Response.json(
        { success: false, message: 'Converted file not found' },
        { status: 404 }
      );
    }
    
    // Get file details
    const filename = basename(job.outputPath);
    const outputFormat = extname(job.outputPath).slice(1);
    
    // Set appropriate content type
    const contentTypeMap: Record<string, string> = {
      // Video formats
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      webm: 'video/webm',
      mkv: 'video/x-matroska',
      
      // Image formats
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      tiff: 'image/tiff',
      avif: 'image/avif',
      
      // Document formats
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      
      // Audio formats
      mp3: 'audio/mpeg',
      wav: 'audio/wav'
    };
    
    const contentType = contentTypeMap[outputFormat] || 'application/octet-stream';
    
    // Read the file
    const fileBuffer = readFileSync(job.outputPath);
    
    // Return the file as a response
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    return Response.json(
      { success: false, message: 'Error downloading file' },
      { status: 500 }
    );
  }
} 