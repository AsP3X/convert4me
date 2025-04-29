import { NextRequest } from 'next/server';

// Global variable to store active controllers for SSE connections
const activeControllers = new Set<ReadableStreamDefaultController>();

// This is a route to handle Server-Sent Events (SSE) connections
export async function GET(request: NextRequest) {
  // Set headers for server-sent events
  const response = new Response(new ReadableStream({
    start(controller) {
      // Add this controller to active controllers
      activeControllers.add(controller);
      
      // Send initial connection message
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ event: 'connected' })}\n\n`));
      
      // Keep the connection alive with regular pings
      const pingInterval = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ event: 'ping' })}\n\n`));
      }, 30000);
      
      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        activeControllers.delete(controller);
        controller.close();
      });
    }
  }), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
  
  return response;
}

// Utility to broadcast conversion progress to all connected clients
export function sendProgressUpdate(jobId: string, progress: number) {
  console.log(`Progress update for job ${jobId}: ${progress}%`);
  
  // Broadcast to all active connections
  activeControllers.forEach(controller => {
    try {
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({ event: 'progress', jobId, progress })}\n\n`
        )
      );
    } catch (error) {
      console.error('Error sending progress update:', error);
    }
  });
} 