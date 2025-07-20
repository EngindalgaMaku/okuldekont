import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');
  
  if (!filename) {
    return NextResponse.json({ message: 'Filename parameter required' }, { status: 400 });
  }

  const backupDir = path.join(process.cwd(), 'database_backups');
  
  // Extract base filename without extension
  const baseName = filename.replace('.json', '');
  
  // Find related files
  const jsonFile = `${baseName}.json`;
  const sqlFile = `${baseName}.sql`;
  const reportFile = `${baseName.replace('mariadb_backup_', 'mariadb_backup_report_')}.md`;
  
  const jsonPath = path.join(backupDir, jsonFile);
  const sqlPath = path.join(backupDir, sqlFile);
  const reportPath = path.join(backupDir, reportFile);
  
  // Check if main JSON file exists
  if (!fs.existsSync(jsonPath)) {
    return NextResponse.json({ message: 'Backup file not found' }, { status: 404 });
  }

  try {
    // Create a readable stream for the ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Add JSON file (always exists)
    if (fs.existsSync(jsonPath)) {
      archive.file(jsonPath, { name: jsonFile });
    }
    
    // Add SQL file if exists
    if (fs.existsSync(sqlPath)) {
      archive.file(sqlPath, { name: sqlFile });
    }
    
    // Add report file if exists
    if (fs.existsSync(reportPath)) {
      archive.file(reportPath, { name: reportFile });
    }

    // Finalize the archive
    archive.finalize();

    // Set headers for download
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', `attachment; filename="${baseName}.zip"`);

    // Convert archive to buffer
    const chunks: Buffer[] = [];
    
    return new Promise<Response>((resolve, reject) => {
      archive.on('data', (chunk: any) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        const buffer = Buffer.concat(chunks);
        headers.set('Content-Length', buffer.length.toString());
        resolve(new NextResponse(buffer, { headers }));
      });

      archive.on('error', (err: any) => {
        console.error('Archive error:', err);
        reject(NextResponse.json({ message: 'Failed to create ZIP', error: err.message }, { status: 500 }));
      });
    });

  } catch (error) {
    console.error('ZIP creation error:', error);
    return NextResponse.json({ message: 'Failed to create ZIP', error: (error as Error).message }, { status: 500 });
  }
}