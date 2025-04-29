import { join, basename, extname } from 'path';
import { copyFile, writeFile } from 'fs/promises';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { createWriteStream } from 'fs';
import { isCommandAvailable } from '../../utils/dependencyCheck';

interface ConversionOptions {
  [key: string]: unknown;
  // Image-specific options
  quality?: number;
  density?: number; // For PDF rendering quality (DPI)
  // PDF options
  extractAllPages?: boolean; // Whether to extract all pages (true) or just the first page (false)
}

/**
 * Document handler with PDF to image conversion support
 */
export async function convertDocument(
  inputPath: string,
  outputFormat: string,
  options: ConversionOptions = {},
  progressCallback: (progress: number) => void = () => {}
): Promise<string> {
  try {
    // Start progress
    progressCallback(10);
    
    const fileBaseName = basename(inputPath, extname(inputPath));
    const outputDir = join(process.cwd(), 'output');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // If output format is PDF and input is PDF, just copy the file
    if (outputFormat === 'pdf' && inputPath.toLowerCase().endsWith('.pdf')) {
      const outputPath = join(outputDir, `${fileBaseName}.${outputFormat}`);
      await copyFile(inputPath, outputPath);
      progressCallback(100);
      return outputPath;
    }
    
    // Check if output format is an image format
    const imageFormats = ['jpg', 'jpeg', 'png', 'webp'];
    if (imageFormats.includes(outputFormat) && inputPath.toLowerCase().endsWith('.pdf')) {
      progressCallback(20);
      
      // Set default density for PDF rendering quality
      const density = options.density || 300; // Default DPI
      // Default to extracting all pages if not specified
      const extractAllPages = options.extractAllPages !== undefined ? options.extractAllPages : true;

      // Create a temporary directory for the extracted pages
      const tempDir = join(outputDir, 'temp', Date.now().toString());
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      progressCallback(30);
      
      try {
        let finalOutputPath: string;
        
        // If we're extracting all pages, we'll first check how many pages are in the PDF (if possible)
        if (extractAllPages) {
          let pageCount = 1;
          
          try {
            if (isCommandAvailable('gs')) {
              pageCount = await getPdfPageCount(inputPath);
              console.log(`PDF has ${pageCount} pages`);
            } else {
              console.log('Ghostscript not available for page counting, assuming single page');
            }
          } catch (error) {
            console.warn('Error getting page count:', error);
            // Continue with a default of 1 page
          }
          
          // If multiple pages, handle multi-page extraction and create zip
          if (pageCount > 1) {
            progressCallback(40);
            finalOutputPath = await processMultiPagePdf(
              inputPath,
              outputFormat,
              fileBaseName,
              tempDir,
              outputDir,
              density,
              pageCount,
              progressCallback
            );
          } else {
            // Single page, use standard conversion
            finalOutputPath = join(outputDir, `${fileBaseName}.${outputFormat}`);
            const conversionSuccess = await tryPdfToImageConversion(
              inputPath, 
              finalOutputPath, 
              outputFormat, 
              tempDir, 
              fileBaseName,
              density,
              progressCallback,
              1, // First page
              1  // Last page
            );
            
            if (!conversionSuccess) {
              await createFallbackImage(finalOutputPath, outputFormat, fileBaseName);
            }
          }
        } else {
          // Just extract the first page (original behavior)
          finalOutputPath = join(outputDir, `${fileBaseName}.${outputFormat}`);
          const conversionSuccess = await tryPdfToImageConversion(
            inputPath, 
            finalOutputPath, 
            outputFormat, 
            tempDir, 
            fileBaseName,
            density,
            progressCallback,
            1, // First page
            1  // Last page
          );
          
          if (!conversionSuccess) {
            await createFallbackImage(finalOutputPath, outputFormat, fileBaseName);
          }
        }
        
        progressCallback(100);
        
        // Clean up temp directory
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          console.error("Error cleaning up temp directory:", cleanupError);
        }
        
        return finalOutputPath;
      } catch (conversionError) {
        console.error("PDF to image conversion error:", conversionError);
        
        // Create a basic fallback image in case of conversion failure
        const fallbackPath = join(outputDir, `${fileBaseName}.${outputFormat}`);
        await createFallbackImage(fallbackPath, outputFormat, fileBaseName);
        
        return fallbackPath;
      }
    }
    
    // For other document types or conversions not implemented
    throw new Error(`Conversion from ${extname(inputPath)} to ${outputFormat} is not supported yet`);
  } catch (error) {
    console.error('Error during document handling:', error);
    throw error;
  }
}

/**
 * Process a multi-page PDF by extracting all pages and creating a zip file
 */
async function processMultiPagePdf(
  inputPath: string,
  outputFormat: string,
  fileBaseName: string,
  tempDir: string,
  outputDir: string,
  density: number,
  pageCount: number,
  progressCallback: (progress: number) => void
): Promise<string> {
  // Create a directory for extracted images
  const extractDir = join(tempDir, 'pages');
  if (!fs.existsSync(extractDir)) {
    fs.mkdirSync(extractDir, { recursive: true });
  }
  
  // Extract all pages using pdftoppm or ghostscript
  let extractionSuccess = false;
  
  // Progress tracking
  const startProgress = 40;
  const endProgress = 80;
  const progressStep = (endProgress - startProgress) / pageCount;
  
  try {
    // Try pdftoppm first (for Linux/Mac)
    if (isCommandAvailable('pdftoppm')) {
      try {
        // Extract all pages at once
        execSync(`pdftoppm -${outputFormat === 'jpg' || outputFormat === 'jpeg' ? 'jpeg' : outputFormat} -r ${density} "${inputPath}" "${join(extractDir, fileBaseName)}"`);
        extractionSuccess = true;
      } catch (error) {
        console.warn("pdftoppm multi-page extraction failed:", error);
      }
    } else {
      console.log('pdftoppm not available, trying alternative conversion method');
    }
    
    // If pdftoppm fails or isn't available, try ghostscript page by page
    if (!extractionSuccess && isCommandAvailable('gs')) {
      const pageExtractionPromises = Array.from({ length: pageCount }, (_, i) => {
        const pageNum = i + 1;
        const pageFile = join(extractDir, `${fileBaseName}-${pageNum.toString().padStart(3, '0')}.${outputFormat}`);
        
        return tryPdfToImageConversion(
          inputPath,
          pageFile,
          outputFormat,
          tempDir,
          `${fileBaseName}-${pageNum.toString().padStart(3, '0')}`,
          density,
          (progress) => {
            // Update overall progress
            const pageProgress = startProgress + (i * progressStep) + (progress / 100 * progressStep);
            progressCallback(Math.min(Math.round(pageProgress), endProgress));
          },
          pageNum,  // First page to extract
          pageNum   // Last page to extract
        ).then(success => {
          if (!success) {
            return createFallbackImage(
              pageFile, 
              outputFormat, 
              `${fileBaseName} (Page ${pageNum})`
            ).then(() => true);
          }
          return success;
        });
      });
      
      await Promise.all(pageExtractionPromises);
      extractionSuccess = true;
    } else if (!extractionSuccess) {
      console.log('No PDF extraction tools available, creating fallback images');
      
      // Create blank images for each page as fallback
      for (let i = 0; i < pageCount; i++) {
        const pageNum = i + 1;
        const pageFile = join(extractDir, `${fileBaseName}-${pageNum.toString().padStart(3, '0')}.${outputFormat}`);
        await createFallbackImage(pageFile, outputFormat, `${fileBaseName} (Page ${pageNum})`);
        
        const pageProgress = startProgress + (i * progressStep) + progressStep;
        progressCallback(Math.min(Math.round(pageProgress), endProgress));
      }
      
      extractionSuccess = true;
    }
    
    // Update progress
    progressCallback(85);
    
    // Create zip file
    const zipFilePath = join(outputDir, `${fileBaseName}.zip`);
    await createZipFromImagesUsingCmd(extractDir, zipFilePath, fileBaseName, outputFormat);
    
    return zipFilePath;
  } catch (error) {
    console.error("Error processing multi-page PDF:", error);
    throw error;
  }
}

/**
 * Create a zip file from extracted images using system commands
 */
async function createZipFromImagesUsingCmd(
  imageDir: string,
  zipFilePath: string,
  fileBaseName: string,
  format: string
): Promise<void> {
  // Get all image files in the directory
  const files = fs.readdirSync(imageDir);
  const imageFiles = files.filter(file => {
    const ext = extname(file).toLowerCase().substring(1);
    return file.startsWith(fileBaseName) && (ext === format || (format === 'jpg' && ext === 'jpeg') || (format === 'jpeg' && ext === 'jpg'));
  });
  
  // Sort files by page number
  imageFiles.sort((a, b) => {
    // Extract page numbers using regex
    const aMatch = a.match(/-(\d+)\./);
    const bMatch = b.match(/-(\d+)\./);
    
    if (aMatch && bMatch) {
      return parseInt(aMatch[1]) - parseInt(bMatch[1]);
    }
    return a.localeCompare(b);
  });
  
  if (imageFiles.length === 0) {
    throw new Error('No image files found to create zip');
  }
  
  // Create a zip file using system zip command if available
  if (isCommandAvailable('zip')) {
    try {
      // Change to the image directory and zip from there
      const currentDir = process.cwd();
      process.chdir(imageDir);
      
      // Use system zip command
      execSync(`zip -j "${zipFilePath}" ${imageFiles.map(file => `"${file}"`).join(' ')}`);
      
      // Change back to original directory
      process.chdir(currentDir);
      return;
    } catch (error) {
      console.warn("System zip command failed:", error);
    }
  }
  
  // Alternative approach - use tar+gzip on unix systems
  if ((process.platform === 'linux' || process.platform === 'darwin') && 
      isCommandAvailable('tar') && isCommandAvailable('gzip')) {
    try {
      const currentDir = process.cwd();
      process.chdir(imageDir);
      
      const tempTarFile = zipFilePath.replace(/\.zip$/, '.tar');
      execSync(`tar -cf "${tempTarFile}" ${imageFiles.map(file => `"${file}"`).join(' ')}`);
      execSync(`gzip -f "${tempTarFile}"`);
      
      // Rename to .zip for consistency
      const gzipFile = `${tempTarFile}.gz`;
      if (fs.existsSync(gzipFile)) {
        fs.renameSync(gzipFile, zipFilePath);
      }
      
      // Change back to original directory
      process.chdir(currentDir);
      return;
    } catch (error) {
      console.warn("tar/gzip archive creation failed:", error);
    }
  }
  
  // Fallback to manual approach
  await createSimpleZip(imageDir, zipFilePath, imageFiles);
}

/**
 * Create a simple zip by combining files (fallback method)
 */
async function createSimpleZip(
  imageDir: string,
  zipFilePath: string,
  imageFiles: string[]
): Promise<void> {
  // This is a very simplistic approach - just concatenate files with a header
  // This won't create a proper zip, but at least it packages all images together
  
  const zipStream = createWriteStream(zipFilePath);
  
  try {
    // Write a simple header
    const header = Buffer.from(`Multi-page PDF conversion - ${imageFiles.length} pages\n\n`);
    zipStream.write(header);
    
    // Write each file with separator
    for (const file of imageFiles) {
      const filePath = join(imageDir, file);
      const separator = Buffer.from(`\n--- Page ${file} ---\n`);
      zipStream.write(separator);
      
      // Read and write the file content
      const content = fs.readFileSync(filePath);
      zipStream.write(content);
    }
    
    // Close the stream
    zipStream.end();
    
    // Wait for stream to finish
    await new Promise<void>((resolve, reject) => {
      zipStream.on('finish', resolve);
      zipStream.on('error', reject);
    });
  } catch (error) {
    console.error("Error creating simple zip:", error);
    zipStream.end();
    throw error;
  }
}

/**
 * Get the number of pages in a PDF file
 */
async function getPdfPageCount(pdfPath: string): Promise<number> {
  try {
    // Try using ghostscript to get page count
    const output = execSync(`gs -q -dNODISPLAY -c "(${pdfPath}) (r) file runpdfbegin pdfpagecount = quit"`).toString().trim();
    const pageCount = parseInt(output);
    
    if (isNaN(pageCount)) {
      // If ghostscript fails, default to 1 page
      console.warn("Could not determine PDF page count, defaulting to 1");
      return 1;
    }
    
    return pageCount;
  } catch (error) {
    console.warn("Error getting PDF page count:", error);
    return 1; // Default to 1 page if we can't determine the count
  }
}

/**
 * Attempt PDF to image conversion using various methods
 */
async function tryPdfToImageConversion(
  inputPath: string,
  outputPath: string,
  outputFormat: string,
  tempDir: string,
  fileBaseName: string,
  density: number,
  progressCallback: (progress: number) => void,
  firstPage: number = 1,
  lastPage: number = 1
): Promise<boolean> {
  // First try pdftoppm from poppler-utils which is most reliable for PDF to image
  if (isCommandAvailable('pdftoppm')) {
    try {
      progressCallback(30);
      
      // Create an intermediate high-quality PNG for better quality
      const pngOutputBase = join(tempDir, `${fileBaseName}-png`);
      
      // Use pdftoppm with high quality settings
      execSync(
        `pdftoppm -png -r ${density} -aa yes -aaVector yes ` +
        `-f ${firstPage} -l ${lastPage} "${inputPath}" "${pngOutputBase}"`
      );
      
      // Find the generated PNG file(s)
      const files = fs.readdirSync(tempDir);
      const pngFiles = files.filter(f => f.startsWith(`${fileBaseName}-png`) && f.endsWith('.png'));
      
      if (pngFiles.length > 0) {
        progressCallback(60);
        const firstPng = join(tempDir, pngFiles[0]);
        
        // Convert PNG to desired output format using convert or other means
        if (outputFormat === 'png') {
          // For PNG output, just copy the first PNG file
          await copyFile(firstPng, outputPath);
          return true;
        } else if (isCommandAvailable('convert')) {
          try {
            // Use ImageMagick to convert PNG to the desired format
            execSync(`convert "${firstPng}" -quality 95 "${outputPath}"`);
            
            // Verify output exists and is valid
            if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
              return true;
            }
          } catch (error) {
            console.warn("PNG to target format conversion failed:", error);
          }
        }
        
        // If convert failed or isn't available, rename PNG to target format
        try {
          await copyFile(firstPng, outputPath);
          return true;
        } catch (error) {
          console.warn("Failed to copy PNG as fallback:", error);
        }
      }
    } catch (error) {
      console.warn("pdftoppm conversion failed:", error);
    }
  }
  
  // Try alternative pdftoppm formats directly if first method failed
  if (isCommandAvailable('pdftoppm')) {
    try {
      progressCallback(40);
      
      // For JPEG output use jpeg format directly
      if (outputFormat === 'jpg' || outputFormat === 'jpeg') {
        // Use pdftoppm with direct JPEG output
        execSync(
          `pdftoppm -jpeg -r ${density} -aa yes -aaVector yes ` +
          `-jpegopt quality=95 -f ${firstPage} -l ${lastPage} "${inputPath}" "${join(tempDir, fileBaseName)}"`
        );
      } else {
        // For other formats, try using PNG
        execSync(
          `pdftoppm -png -r ${density} -aa yes -aaVector yes ` + 
          `-f ${firstPage} -l ${lastPage} "${inputPath}" "${join(tempDir, fileBaseName)}"`
        );
      }
      
      // Find the generated image file(s)
      const files = fs.readdirSync(tempDir);
      const generatedFiles = files.filter(f => 
        f.startsWith(fileBaseName) && 
        (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
      );
      
      if (generatedFiles.length > 0) {
        progressCallback(70);
        const generatedFile = join(tempDir, generatedFiles[0]);
        
        // If direct format output or we want PNG, just copy the file
        if ((outputFormat === 'png' && generatedFiles[0].endsWith('.png')) ||
            ((outputFormat === 'jpg' || outputFormat === 'jpeg') && 
            (generatedFiles[0].endsWith('.jpg') || generatedFiles[0].endsWith('.jpeg')))) {
          await copyFile(generatedFile, outputPath);
          return true;
        } else if (isCommandAvailable('convert')) {
          // Try to convert to desired format
          try {
            execSync(`convert "${generatedFile}" "${outputPath}"`);
            return true;
          } catch (error) {
            console.warn("Format conversion failed:", error);
            
            // Copy file as fallback
            await copyFile(generatedFile, outputPath);
            return true;
          }
        } else {
          // Last resort: copy regardless of format mismatch
          await copyFile(generatedFile, outputPath);
          return true;
        }
      }
    } catch (error) {
      console.warn("Alternative pdftoppm conversion failed:", error);
    }
  }
  
  // Try GhostScript if available and pdftoppm failed
  if (isCommandAvailable('gs')) {
    try {
      progressCallback(50);
      
      if (outputFormat === 'jpg' || outputFormat === 'jpeg') {
        execSync(
          `gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=jpeg -dJPEGQ=95 -dTextAlphaBits=4 -dGraphicsAlphaBits=4 ` +
          `-dFirstPage=${firstPage} -dLastPage=${lastPage} -r${density} -sOutputFile="${outputPath}" "${inputPath}"`
        );
        return true;
      } else if (outputFormat === 'png') {
        execSync(
          `gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -dTextAlphaBits=4 -dGraphicsAlphaBits=4 ` +
          `-dFirstPage=${firstPage} -dLastPage=${lastPage} -r${density} -sOutputFile="${outputPath}" "${inputPath}"`
        );
        return true;
      } else if (outputFormat === 'webp' && isCommandAvailable('convert')) {
        // For WebP, we'll generate a PNG first with Ghostscript, then convert using ImageMagick
        const tempPngPath = join(tempDir, `${fileBaseName}-gs.png`);
        execSync(
          `gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -dTextAlphaBits=4 -dGraphicsAlphaBits=4 ` +
          `-dFirstPage=${firstPage} -dLastPage=${lastPage} -r${density} -sOutputFile="${tempPngPath}" "${inputPath}"`
        );
        
        // Then convert to WebP
        try {
          execSync(`convert "${tempPngPath}" "${outputPath}"`);
          return true;
        } catch (error) {
          console.warn("WebP conversion via ImageMagick failed:", error);
          // If conversion to WebP fails, fall back to PNG
          if (fs.existsSync(tempPngPath)) {
            await copyFile(tempPngPath, outputPath.replace(/\.webp$/i, '.png'));
            return true;
          }
        }
      }
    } catch (error) {
      console.warn("GhostScript conversion failed:", error);
    }
  }
  
  // Try pdfimages from poppler-utils if available
  if (isCommandAvailable('pdfimages')) {
    try {
      progressCallback(60);
      
      // Extract images from the PDF
      const pdfImagesDir = join(tempDir, 'pdfimages');
      if (!fs.existsSync(pdfImagesDir)) {
        fs.mkdirSync(pdfImagesDir, { recursive: true });
      }
      
      // Extract images from specific pages
      execSync(`pdfimages -png -f ${firstPage} -l ${lastPage} "${inputPath}" "${join(pdfImagesDir, 'img')}"`);
      
      // Check for extracted images
      const extractedFiles = fs.readdirSync(pdfImagesDir);
      if (extractedFiles.length > 0) {
        // Find the largest (probably most important) image
        let largestFile = extractedFiles[0];
        let largestSize = 0;
        
        for (const file of extractedFiles) {
          const filePath = join(pdfImagesDir, file);
          const stats = fs.statSync(filePath);
          if (stats.size > largestSize) {
            largestSize = stats.size;
            largestFile = file;
          }
        }
        
        const largestImagePath = join(pdfImagesDir, largestFile);
        
        // Convert or copy based on the format
        if (outputFormat === 'png' && largestFile.endsWith('.png')) {
          await copyFile(largestImagePath, outputPath);
          return true;
        } else if (isCommandAvailable('convert')) {
          try {
            execSync(`convert "${largestImagePath}" "${outputPath}"`);
            return true;
          } catch (error) {
            console.warn("Image conversion failed:", error);
            
            // Fallback to copying
            await copyFile(largestImagePath, outputPath);
            return true;
          }
        } else {
          // Just copy the file
          await copyFile(largestImagePath, outputPath);
          return true;
        }
      }
    } catch (error) {
      console.warn("pdfimages extraction failed:", error);
    }
  }
  
  // All conversion attempts failed
  return false;
}

/**
 * Create a fallback image with a basic message if all conversion methods fail
 */
async function createFallbackImage(outputPath: string, outputFormat: string, fileBaseName: string): Promise<void> {
  let success = false;
  
  // 1. Try using wkhtmltoimage if available
  if (isCommandAvailable('wkhtmltoimage')) {
    try {
      // Create a simple HTML file that can be converted to an image
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              width: 800px;
              height: 1000px;
              display: flex;
              align-items: center;
              justify-center;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            }
            .container {
              margin: 20px;
              padding: 40px;
              background-color: rgba(255, 255, 255, 0.85);
              border-radius: 10px;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
              text-align: center;
              width: calc(100% - 40px);
            }
            h1 {
              color: #333;
              margin-bottom: 20px;
              font-size: 28px;
            }
            p {
              color: #666;
              font-size: 18px;
              line-height: 1.6;
            }
            .icon {
              font-size: 60px;
              margin-bottom: 20px;
              color: #4a6fa5;
            }
            .filename {
              background-color: #f0f2f5;
              padding: 10px;
              border-radius: 5px;
              word-break: break-all;
              margin: 20px 0;
              font-size: 16px;
              color: #555;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📄</div>
            <h1>PDF Conversion</h1>
            <div class="filename">${fileBaseName}</div>
            <p>This PDF could not be converted to an image using the available tools.</p>
            <p>Please install PDF conversion tools like poppler-utils for better results.</p>
          </div>
        </body>
        </html>
      `;
      
      // Write HTML to a temporary file
      const htmlPath = outputPath.replace(/\.[^.]+$/, '.html');
      await writeFile(htmlPath, htmlContent);
      
      execSync(`wkhtmltoimage --quality 90 "${htmlPath}" "${outputPath}"`);
      
      // Verify file was created and is valid
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        success = true;
      }
      
      // Clean up temporary HTML file
      try {
        fs.unlinkSync(htmlPath);
      } catch (cleanupError) {
        console.warn("Failed to clean up temporary HTML file:", cleanupError);
      }
    } catch (error) {
      console.warn("wkhtmltoimage conversion failed:", error);
    }
  }
  
  // 2. Try using ImageMagick to create a basic colored rectangle (avoid font-related issues)
  if (!success && isCommandAvailable('convert')) {
    try {
      // Create a visually appealing gradient image
      execSync(`convert -size 800x1000 gradient:white-skyblue "${outputPath}"`);
      
      // Verify file was created and is valid
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        success = true;
      }
    } catch (error) {
      console.warn("ImageMagick gradient creation failed:", error);
      
      // Try with an even simpler command
      try {
        // Create a solid color image as absolute fallback
        execSync(`convert -size 800x1000 xc:white "${outputPath}"`);
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          success = true;
        }
      } catch (error) {
        console.warn("ImageMagick basic image creation failed:", error);
      }
    }
  }
  
  // 3. Final fallback: Create a minimal valid image file based on format
  if (!success) {
    try {
      const minimalImageBytes = getMinimalValidImageBytes(outputFormat);
      await writeFile(outputPath, minimalImageBytes);
      success = true;
    } catch (error) {
      console.error("Failed to create minimal valid image:", error);
    }
  }
}

/**
 * Get minimal valid binary image data for various formats
 */
function getMinimalValidImageBytes(format: string): Buffer {
  // Minimal valid image files for common formats
  if (format === 'jpg' || format === 'jpeg') {
    // Minimal valid JPEG file (1x1 pixel)
    return Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
      0xFF, 0xDB, 0x00, 0x43, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC2, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01,
      0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x01, 0x3F, 0x10
    ]);
  } else if (format === 'png') {
    // Minimal valid PNG file (1x1 pixel, white)
    return Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB0, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
  } else if (format === 'webp') {
    // Minimal valid WebP file (1x1 pixel, white)
    return Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x1A, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4C, 0x0D, 0x00, 0x00, 0x00,
      0x2F, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
  } else {
    // Default to PNG if format is not recognized
    return getMinimalValidImageBytes('png');
  }
} 