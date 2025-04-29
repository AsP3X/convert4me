// Define supported file formats and conversion options
const videoConverters = {
  supportedInputFormats: ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm'],
  possibleOutputFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm']
};

const imageConverters = {
  supportedInputFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'avif'],
  possibleOutputFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff']
};

// Add document converters
const documentConverters = {
  supportedInputFormats: ['pdf', 'docx'],
  possibleOutputFormats: ['pdf', 'jpg', 'jpeg', 'png', 'webp']
};

// All converters in one array
const converters = [
  videoConverters,
  imageConverters,
  documentConverters
];

/**
 * Get all supported input formats from all converters
 */
export function getSupportedInputFormats(): string[] {
  const formats = new Set<string>();
  
  converters.forEach(converter => {
    converter.supportedInputFormats.forEach(format => formats.add(format));
  });
  
  return Array.from(formats);
}

/**
 * Get possible output formats for a given input format
 */
export function getPossibleOutputFormats(inputFormat: string): string[] {
  const formats = new Set<string>();
  
  converters.forEach(converter => {
    if (converter.supportedInputFormats.includes(inputFormat)) {
      converter.possibleOutputFormats.forEach(format => formats.add(format));
    }
  });
  
  return Array.from(formats);
}

/**
 * Check if conversion is supported
 */
export function isConversionSupported(inputFormat: string, outputFormat: string): boolean {
  for (const converter of converters) {
    if (converter.supportedInputFormats.includes(inputFormat) && 
        converter.possibleOutputFormats.includes(outputFormat)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect file type from file extension
 */
export function detectFileType(filePath: string): string {
  const extension = filePath.substring(filePath.lastIndexOf('.') + 1).toLowerCase();
  return extension;
} 