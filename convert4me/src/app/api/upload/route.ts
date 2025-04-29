import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getSupportedInputFormats, getPossibleOutputFormats } from '../utils/converters';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return Response.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    // Check if the file format is supported
    const fileExt = extname(file.name).toLowerCase().slice(1);
    const supportedFormats = getSupportedInputFormats();
    
    if (!supportedFormats.includes(fileExt)) {
      return Response.json(
        {
          success: false,
          message: `Unsupported file format: ${fileExt}. Supported formats: ${supportedFormats.join(', ')}`
        },
        { status: 400 }
      );
    }
    
    // Create unique filename
    const uniqueFilename = `${uuidv4()}${extname(file.name)}`;
    
    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    
    // Save the file
    const filePath = join(uploadsDir, uniqueFilename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
    
    // Return file info
    const uploadedFile = {
      filename: uniqueFilename,
      originalName: file.name,
      path: filePath,
      size: file.size,
      mimetype: file.type,
      fileType: fileExt,
      possibleOutputFormats: getPossibleOutputFormats(fileExt)
    };
    
    return Response.json({
      success: true,
      message: 'File uploaded successfully',
      file: uploadedFile
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json(
      { success: false, message: 'Error uploading file' },
      { status: 500 }
    );
  }
} 