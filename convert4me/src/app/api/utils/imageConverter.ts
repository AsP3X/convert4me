import { join, basename, extname } from 'path';
import sharp from 'sharp';

interface ConversionOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  quality?: number;
  [key: string]: unknown;
}

/**
 * Converts an image file to the specified output format
 */
export async function convertImage(
  inputPath: string,
  outputFormat: string,
  options: ConversionOptions = {},
  progressCallback: (progress: number) => void = () => {}
): Promise<string> {
  try {
    // Set starting progress
    progressCallback(10);
    
    const outputFilename = `${basename(inputPath, extname(inputPath))}.${outputFormat}`;
    const outputDir = join(process.cwd(), 'output');
    const outputPath = join(outputDir, outputFilename);
    
    // Create image processor
    let image = sharp(inputPath);
    
    // Apply transformations if needed
    if (options.width || options.height) {
      image = image.resize({
        width: options.width,
        height: options.height,
        fit: options.fit || 'contain'
      });
    }
    
    // Apply quality settings if specified
    const formatOptions: { quality?: number } = {};
    if (options.quality && ['jpg', 'jpeg', 'webp', 'avif'].includes(outputFormat)) {
      formatOptions.quality = options.quality;
    }
    
    // Update progress
    progressCallback(50);
    
    // Convert to the desired format
    switch (outputFormat) {
      case 'jpg':
      case 'jpeg':
        await image.jpeg(formatOptions).toFile(outputPath);
        break;
      case 'png':
        await image.png(formatOptions).toFile(outputPath);
        break;
      case 'webp':
        await image.webp(formatOptions).toFile(outputPath);
        break;
      case 'avif':
        await image.avif(formatOptions).toFile(outputPath);
        break;
      case 'tiff':
        await image.tiff(formatOptions).toFile(outputPath);
        break;
      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }
    
    // Complete progress
    progressCallback(100);
    
    return outputPath;
  } catch (error) {
    console.error('Error during image conversion:', error);
    throw error;
  }
} 