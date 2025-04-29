# Convert4Me - File Conversion Application

Convert4Me is a modern web application that allows users to convert files between different formats. The application supports various types of conversions including video, image, document, and audio files.

## Features

- Drag-and-drop file upload
- Real-time conversion progress tracking
- Support for various file formats
- Clean, modern UI with Tailwind CSS
- Responsive design for all device sizes

## Supported Formats

### Video
- MP4, MOV, AVI, MKV, WebM

### Image
- JPG/JPEG, PNG, GIF, WebP, TIFF, AVIF

### Document (Planned)
- PDF, DOCX

### Audio (Planned)
- MP3, WAV

## Technology Stack

### Backend
- Next.js API Routes
- Server-Sent Events for real-time updates
- FFmpeg for video/audio conversion
- Sharp for image processing
- In-memory database for job tracking

### Frontend
- Next.js with App Router
- React and TypeScript
- Tailwind CSS for styling
- Modern, responsive design with glassmorphism

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- FFmpeg (installed automatically via ffmpeg-static)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/convert4me.git
cd convert4me
```

2. Install dependencies
```bash
npm install
```

### Running the application

Start the development server:
```bash
npm run dev
```

This will start the application at http://localhost:3000.

## Production Deployment

Build the Next.js application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## How It Works

1. **Upload**: Users upload files through the drag-and-drop interface
2. **Convert**: The uploaded file is sent to the backend where it's converted using the appropriate tool (FFmpeg for videos, Sharp for images)
3. **Monitor**: Real-time progress updates are sent to the frontend using Server-Sent Events
4. **Download**: Once conversion is complete, users can download the converted file

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Acknowledgements

- FFmpeg - For powerful media processing
- Sharp - For image manipulation
- Next.js and Tailwind CSS - For the modern UI framework
