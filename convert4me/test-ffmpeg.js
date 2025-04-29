// Test script to verify FFmpeg functionality
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create test directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create a small test video file (1x1 pixel, 1 second)
const createTestVideo = async () => {
  const ffmpegPath = '/usr/bin/ffmpeg';
  const testVideoPath = path.join(uploadsDir, 'test.mp4');
  
  console.log(`Creating test video at ${testVideoPath}...`);
  
  const args = [
    '-f', 'lavfi',           // Use lavfi input
    '-i', 'color=c=red:s=10x10:r=30:d=1',  // Create a 10x10 red square for 1 second
    '-c:v', 'libx264',       // Use H.264 codec
    '-t', '1',               // Duration: 1 second
    '-pix_fmt', 'yuv420p',   // Pixel format for compatibility
    '-y',                    // Overwrite output file if it exists
    testVideoPath            // Output file
  ];
  
  return new Promise((resolve, reject) => {
    console.log(`Running command: ${ffmpegPath} ${args.join(' ')}`);
    
    const process = spawn(ffmpegPath, args);
    let stderr = '';
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log('Test video created successfully');
        resolve(testVideoPath);
      } else {
        console.error(`Failed to create test video. Exit code: ${code}`);
        console.error(stderr);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
    
    process.on('error', (err) => {
      console.error('Failed to start FFmpeg process:', err);
      reject(err);
    });
  });
};

// Convert the test video file
const convertTestVideo = async (inputPath) => {
  const ffmpegPath = '/usr/bin/ffmpeg';
  const outputPath = path.join(outputDir, 'test.mov');
  
  console.log(`Converting test video to ${outputPath}...`);
  
  const args = [
    '-i', inputPath,         // Input file
    '-c:v', 'libx264',       // Use H.264 codec
    '-y',                    // Overwrite output file if it exists
    outputPath               // Output file
  ];
  
  return new Promise((resolve, reject) => {
    console.log(`Running command: ${ffmpegPath} ${args.join(' ')}`);
    
    const process = spawn(ffmpegPath, args);
    let stderr = '';
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log(data.toString());
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log('Test video converted successfully');
        resolve(outputPath);
      } else {
        console.error(`Failed to convert test video. Exit code: ${code}`);
        console.error(stderr);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
    
    process.on('error', (err) => {
      console.error('Failed to start FFmpeg process:', err);
      reject(err);
    });
  });
};

// Run the test
(async () => {
  try {
    const testVideoPath = await createTestVideo();
    const convertedVideoPath = await convertTestVideo(testVideoPath);
    
    console.log('Test completed successfully');
    console.log(`Test video: ${testVideoPath}`);
    console.log(`Converted video: ${convertedVideoPath}`);
    
    // Verify the files exist
    console.log(`Test video exists: ${fs.existsSync(testVideoPath)}`);
    console.log(`Converted video exists: ${fs.existsSync(convertedVideoPath)}`);
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
})(); 