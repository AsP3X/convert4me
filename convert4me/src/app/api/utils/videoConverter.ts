import { join, basename, extname } from 'path';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { existsSync } from 'fs';
import { sendProgressUpdate } from '../socket/route';

interface ConversionOptions {
  resolution?: string;
  frameRate?: number;
  videoBitrate?: string;
  audioBitrate?: string;
  [key: string]: unknown;
}

// Known system paths for FFmpeg
const FFMPEG_SYSTEM_PATHS = [
  '/usr/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
  '/opt/homebrew/bin/ffmpeg',
  'C:\\ffmpeg\\bin\\ffmpeg.exe'
];

/**
 * Converts a video file to the specified output format
 */
export async function convertVideo(
  inputPath: string, 
  outputFormat: string, 
  options: ConversionOptions = {}, 
  progressCallback: (progress: number) => void = () => {},
  jobId?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Find a working ffmpeg command - try multiple possible locations
    let ffmpegCmd = '';
    
    // First try the ffmpeg-static path
    if (ffmpegPath && existsSync(ffmpegPath)) {
      ffmpegCmd = ffmpegPath;
    } else {
      // Then try common system paths
      for (const path of FFMPEG_SYSTEM_PATHS) {
        if (existsSync(path)) {
          ffmpegCmd = path;
          break;
        }
      }
      
      // If still not found, try the simple command (might be in PATH)
      if (!ffmpegCmd) {
        ffmpegCmd = 'ffmpeg';
      }
    }

    const outputFilename = `${basename(inputPath, extname(inputPath))}.${outputFormat}`;
    const outputDir = join(process.cwd(), 'output');
    const outputPath = join(outputDir, outputFilename);

    // Build FFmpeg command - adding explicit codec parameters
    const args = ['-i', inputPath];

    // Add video options if provided
    if (options.resolution) {
      args.push('-s', options.resolution);
    }
    if (options.frameRate) {
      args.push('-r', options.frameRate.toString());
    }
    if (options.videoBitrate) {
      args.push('-b:v', options.videoBitrate);
    }
    if (options.audioBitrate) {
      args.push('-b:a', options.audioBitrate);
    }

    // Add explicit codec setting based on output format
    if (['mp4', 'mov', 'mkv'].includes(outputFormat)) {
      args.push('-c:v', 'libx264');  // Use H.264 codec
      args.push('-pix_fmt', 'yuv420p'); // Ensure compatibility
    }

    // Add output path
    args.push('-y', outputPath);

    // Log the command
    console.log(`Using FFmpeg at: ${ffmpegCmd}`);
    console.log(`FFmpeg command: ${ffmpegCmd} ${args.join(' ')}`);

    // Start FFmpeg process
    const ffmpeg = spawn(ffmpegCmd, args);
    let stderr = '';

    // Capture stderr for progress information and errors
    ffmpeg.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      
      // Log FFmpeg output for debugging
      console.log(chunk);
      
      // Try to extract progress information
      const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.\d{2}/);
      const timeMatch = chunk.match(/time=(\d{2}):(\d{2}):(\d{2})\.\d{2}/);
      
      if (durationMatch && timeMatch) {
        const durationSeconds = 
          parseInt(durationMatch[1]) * 3600 + 
          parseInt(durationMatch[2]) * 60 + 
          parseInt(durationMatch[3]);
        
        const currentSeconds = 
          parseInt(timeMatch[1]) * 3600 + 
          parseInt(timeMatch[2]) * 60 + 
          parseInt(timeMatch[3]);
        
        if (durationSeconds > 0) {
          const progress = Math.round((currentSeconds / durationSeconds) * 100);
          progressCallback(progress);
          
          // Send progress update through SSE if jobId is provided
          if (jobId) {
            sendProgressUpdate(jobId, progress);
          }
        }
      }
    });

    // Handle process exit
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        progressCallback(100);
        // Send final progress update
        if (jobId) {
          sendProgressUpdate(jobId, 100);
        }
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });

    // Handle process error
    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg process error: ${err.message}`));
    });
  });
} 