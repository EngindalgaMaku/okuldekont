import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const filenameToDownload = searchParams.get('download');
  const backupDir = path.join(process.cwd(), 'database_backups');

  // Handle Download Request
  if (filenameToDownload) {
    const filePath = path.join(backupDir, filenameToDownload);
    try {
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ message: 'File not found' }, { status: 404 });
      }
      const fileBuffer = fs.readFileSync(filePath);
      const headers = new Headers();
      headers.set('Content-Disposition', `attachment; filename="${filenameToDownload}"`);
      headers.set('Content-Type', 'application/octet-stream');
      headers.set('Content-Length', fileBuffer.length.toString());
      return new NextResponse(fileBuffer, { headers });
    } catch (error) {
      console.error(`Error downloading backup ${filenameToDownload}:`, error);
      return NextResponse.json({ message: 'Failed to download backup', error: (error as Error).message }, { status: 500 });
    }
  }

  // Handle List Request
  try {
    if (!fs.existsSync(backupDir)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sql') && file.startsWith('professional_backup_'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        // Better date parsing from filename
        const dateMatch = file.match(/professional_backup_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
        let date;
        if (dateMatch) {
          // Convert the timestamp format back to a valid date
          const timestamp = dateMatch[1].replace(/-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3Z');
          date = new Date(timestamp).toISOString();
        } else {
          date = stats.mtime.toISOString();
        }

        return {
          id: file,
          backup_name: file,
          backup_date: date,
          size_mb: (stats.size / 1024 / 1024).toFixed(2),
          backup_status: 'completed',
          table_count: 'N/A',
          record_count: 'N/A',
          rpc_function_count: 'N/A',
          trigger_count: 'N/A',
          index_count: 'N/A',
          policy_count: 'N/A',
        };
      })
      .sort((a, b) => new Date(b.backup_date).getTime() - new Date(a.backup_date).getTime());

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error listing backups:', error);
    return NextResponse.json({ message: 'Failed to list backups', error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<Response> {
    const { filename } = await request.json();

    if (!filename) {
        return NextResponse.json({ message: 'Filename is required' }, { status: 400 });
    }

    const backupDir = path.join(process.cwd(), 'database_backups');
    const filePath = path.join(backupDir, filename);
    const reportPath = filePath.replace('.sql', '_report.md');

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        if (fs.existsSync(reportPath)) {
            fs.unlinkSync(reportPath);
        }
        return NextResponse.json({ success: true, message: 'Backup deleted successfully.' });
    } catch (error) {
        console.error('Error deleting backup:', error);
        return NextResponse.json({ message: 'Failed to delete backup', error: (error as Error).message }, { status: 500 });
    }
}