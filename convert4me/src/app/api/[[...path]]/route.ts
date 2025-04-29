import { NextRequest, NextResponse } from 'next/server';
import { app } from '../../../../backend';

// Create a request handler that forwards requests to Express
export async function GET(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return handleRequest(request, params);
}

export async function POST(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return handleRequest(request, params);
}

export async function PUT(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return handleRequest(request, params);
}

export async function DELETE(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return handleRequest(request, params);
}

async function handleRequest(request: NextRequest, params: { path?: string[] }) {
  try {
    // Get the path
    const path = params.path ? `/${params.path.join('/')}` : '/';
    const url = new URL(request.url);
    const queryString = url.search;
    const fullPath = `/api${path}${queryString}`;
    
    // Get the request method and headers
    const method = request.method;
    const headers = Object.fromEntries(request.headers);
    
    // Get the request body if it exists
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        body = formData;
      } else {
        const arrayBuffer = await request.arrayBuffer();
        body = Buffer.from(arrayBuffer);
      }
    }
    
    // Create a promise that resolves with the Express response
    const response = await new Promise<NextResponse>((resolve, reject) => {
      try {
        const req = {
          method,
          url: fullPath,
          headers,
          body,
          pipe: () => {},
        };
        
        const res = {
          statusCode: 200,
          headers: {} as Record<string, string>,
          body: [] as Buffer[],
          
          setHeader(name: string, value: string) {
            this.headers[name.toLowerCase()] = value;
          },
          
          getHeader(name: string) {
            return this.headers[name.toLowerCase()];
          },
          
          write(chunk: Buffer) {
            this.body.push(chunk);
          },
          
          end(chunk?: Buffer) {
            if (chunk) {
              this.body.push(chunk);
            }
            
            // Convert the response body to a single buffer
            const buffer = Buffer.concat(this.body);
            
            // Create the NextResponse
            const nextResponse = new NextResponse(buffer, {
              status: this.statusCode,
              headers: this.headers,
            });
            
            resolve(nextResponse);
          },
          
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          
          json(data: unknown) {
            this.setHeader('Content-Type', 'application/json');
            this.end(Buffer.from(JSON.stringify(data)));
          },
        };
        
        // Handle the request with Express
        app(req, res);
      } catch (error) {
        reject(error);
      }
    });
    
    return response;
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 