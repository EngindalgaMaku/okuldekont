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

    // Get both JSON and SQL backup files
    const jsonFiles = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.json') && (file.startsWith('mariadb_backup_') || file.startsWith('data_backup_')))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        // Parse timestamp from filename
        const timestampMatch = file.match(/_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
        let date = stats.mtime.toISOString();
        if (timestampMatch) {
          try {
            // Convert filename timestamp back to proper ISO format
            const timestamp = timestampMatch[1].replace(/-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3Z');
            date = new Date(timestamp).toISOString();
          } catch (e) {
            date = stats.mtime.toISOString();
          }
        }

        // Determine backup type and get corresponding files
        const isMariaDB = file.startsWith('mariadb_backup_');
        const baseTimestamp = timestampMatch ? timestampMatch[1] : '';
        
        // SQL file
        const sqlFile = isMariaDB ? `mariadb_backup_${baseTimestamp}.sql` : null;
        const sqlPath = sqlFile ? path.join(backupDir, sqlFile) : null;
        const sqlExists = sqlPath ? fs.existsSync(sqlPath) : false;
        const sqlSize = sqlExists && sqlPath ? fs.statSync(sqlPath).size : 0;
        
        // Physical files ZIP
        const filesZipFile = isMariaDB ? `mariadb_files_backup_${baseTimestamp}.zip` : null;
        const filesZipPath = filesZipFile ? path.join(backupDir, filesZipFile) : null;
        const filesZipExists = filesZipPath ? fs.existsSync(filesZipPath) : false;
        const filesZipSize = filesZipExists && filesZipPath ? fs.statSync(filesZipPath).size : 0;

        return {
          id: file,
          backup_name: file,
          backup_date: date,
          size_mb: (stats.size / 1024 / 1024).toFixed(2),
          sql_size_mb: sqlExists ? (sqlSize / 1024 / 1024).toFixed(2) : '0',
          files_size_mb: filesZipExists ? (filesZipSize / 1024 / 1024).toFixed(2) : '0',
          backup_status: 'completed',
          backup_type: isMariaDB ? 'MariaDB' : 'Legacy',
          has_sql: sqlExists,
          has_files: filesZipExists,
          sql_file: sqlFile,
          files_zip_file: filesZipFile,
          table_count: 'N/A',
          record_count: 'N/A',
        };
      })
      .sort((a, b) => new Date(b.backup_date).getTime() - new Date(a.backup_date).getTime());

    const files = jsonFiles;

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
    
    try {
        let deletedFiles = [];
        
        // Extract timestamp from filename to find all related files
        const timestampMatch = filename.match(/_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
        
        if (timestampMatch) {
            const timestamp = timestampMatch[1];
            
            // For MariaDB backups, delete all related files
            if (filename.startsWith('mariadb_backup_')) {
                const jsonFile = `mariadb_backup_${timestamp}.json`;
                const sqlFile = `mariadb_backup_${timestamp}.sql`;
                const reportFile = `mariadb_backup_report_${timestamp}.md`;
                const filesZipFile = `mariadb_files_backup_${timestamp}.zip`;
                
                // Delete JSON file
                const jsonPath = path.join(backupDir, jsonFile);
                if (fs.existsSync(jsonPath)) {
                    fs.unlinkSync(jsonPath);
                    deletedFiles.push(jsonFile);
                }
                
                // Delete SQL file
                const sqlPath = path.join(backupDir, sqlFile);
                if (fs.existsSync(sqlPath)) {
                    fs.unlinkSync(sqlPath);
                    deletedFiles.push(sqlFile);
                }
                
                // Delete Report file
                const reportPath = path.join(backupDir, reportFile);
                if (fs.existsSync(reportPath)) {
                    fs.unlinkSync(reportPath);
                    deletedFiles.push(reportFile);
                }
                
                // Delete Physical files ZIP
                const filesZipPath = path.join(backupDir, filesZipFile);
                if (fs.existsSync(filesZipPath)) {
                    fs.unlinkSync(filesZipPath);
                    deletedFiles.push(filesZipFile);
                }
            } else {
                // For legacy backups, just delete the file itself
                const filePath = path.join(backupDir, filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    deletedFiles.push(filename);
                }
            }
        } else {
            // Fallback: delete just the specified file
            const filePath = path.join(backupDir, filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                deletedFiles.push(filename);
            }
        }
        
        if (deletedFiles.length === 0) {
            return NextResponse.json({ message: 'No files were found to delete' }, { status: 404 });
        }
        
        return NextResponse.json({
            success: true,
            message: `Backup deleted successfully. Files removed: ${deletedFiles.join(', ')}`,
            deletedFiles
        });
    } catch (error) {
        console.error('Error deleting backup:', error);
        return NextResponse.json({ message: 'Failed to delete backup', error: (error as Error).message }, { status: 500 });
    }
}