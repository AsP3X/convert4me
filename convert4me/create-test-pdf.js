// Simple script to create a test PDF file for testing
const fs = require('fs');
const path = require('path');

// Create a very simple PDF (this is just a minimal valid PDF structure)
const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 68 >>
stream
BT
/F1 24 Tf
100 700 Td
(This is a test PDF file for Convert4Me) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000058 00000 n
0000000115 00000 n
0000000198 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
316
%%EOF`;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Write the PDF file
const testPdfPath = path.join(uploadsDir, 'test.pdf');
fs.writeFileSync(testPdfPath, pdfContent);

console.log(`Test PDF created at: ${testPdfPath}`);
console.log('You can now upload this file to test PDF handling.'); 