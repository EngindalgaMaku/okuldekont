import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({}));
    const backupType = body.type || 'full'; // 'full' or comma-separated table names

    if (typeof backupType !== 'string' || !/^(full|[A-Za-z0-9_]+(,[A-Za-z0-9_]+)*)$/.test(backupType)) {
      return NextResponse.json({ success: false, message: 'Geçersiz yedekleme türü.' }, { status: 400 });
    }
    
    // Use MariaDB backup script
    const scriptPath = path.join(process.cwd(), 'scripts', 'mariadb-backup.js');

    if (!fs.existsSync(scriptPath)) {
      console.error(`❌ MariaDB backup script not found at: ${scriptPath}`);
      return NextResponse.json({ success: false, message: 'MariaDB backup script not found.' }, { status: 500 });
    }
    
    
    // Execute the MariaDB backup script with type parameter (shell kullanılmadan, argüman olarak)
    return new Promise<Response>((resolve) => {
      const backupProcess = execFile(process.execPath, [scriptPath, backupType], {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      let stdout = '';
      let stderr = '';

      backupProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
      });

      backupProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        console.error(`MariaDB backup warning: ${error}`);
        stderr += error;
      });

      backupProcess.on('close', (code) => {
        if (code === 0) {
          
          // Extract file information from MariaDB backup output
          const jsonFileMatch = stdout.match(/JSON:\s*([^\s]+)/);
          const sqlFileMatch = stdout.match(/SQL:\s*([^\s]+)/);
          const reportFileMatch = stdout.match(/Report:\s*([^\s]+)/);
          const filesFileMatch = stdout.match(/Files:\s*([^\s]+)/);
          const recordsMatch = stdout.match(/Records:\s*(\d+)/);
          const jsonSizeMatch = stdout.match(/JSONSize:\s*([\d.]+)\s*MB/);
          const sqlSizeMatch = stdout.match(/SQLSize:\s*([\d.]+)\s*MB/);
          const filesSizeMatch = stdout.match(/FilesSize:\s*([\d.]+)\s*MB/);
          
          // Check if all tables were successful
          const allTablesSuccess = stdout.includes('TÜM TABLOLAR BAŞARIYLA YEDEKLENDİ!');
          const physicalFilesSuccess = stdout.includes('FİZİKSEL DOSYALAR BAŞARIYLA YEDEKLENDİ!');
          
          let message = 'MariaDB veri yedeği başarıyla oluşturuldu!';
          if (physicalFilesSuccess) {
            message = 'MariaDB kapsamlı yedeği (veri + dosyalar) başarıyla oluşturuldu!';
          }
          
          resolve(NextResponse.json({
            success: true,
            message: message,
            backupFile: jsonFileMatch ? path.basename(jsonFileMatch[1].trim()) : null,
            sqlFile: sqlFileMatch ? path.basename(sqlFileMatch[1].trim()) : null,
            reportFile: reportFileMatch ? path.basename(reportFileMatch[1].trim()) : null,
            filesFile: filesFileMatch ? path.basename(filesFileMatch[1].trim()) : null,
            backup_type: backupType === 'full' ? 'full_backup' : 'selective_backup',
            statistics: {
              total_records: recordsMatch ? parseInt(recordsMatch[1]) : 0,
              json_size_mb: jsonSizeMatch ? parseFloat(jsonSizeMatch[1]) : 0,
              sql_size_mb: sqlSizeMatch ? parseFloat(sqlSizeMatch[1]) : 0,
              files_size_mb: filesSizeMatch ? parseFloat(filesSizeMatch[1]) : 0,
              all_tables_successful: allTablesSuccess,
              physical_files_successful: physicalFilesSuccess
            },
            note: physicalFilesSuccess
              ? 'Bu yedek JSON, SQL formatında veri ve fiziksel dosyaları (dekontlar + belgeler) içerir. SQL dosyası MariaDB\'ye, ZIP dosyası da uploads klasörüne geri yüklenebilir.'
              : 'Bu yedek hem JSON hem de SQL formatında oluşturuldu. SQL dosyası MariaDB\'ye geri yüklenebilir.',
            output: stdout
          }));
        } else {
          console.error(`❌ MariaDB backup failed with code ${code}.`);
          resolve(NextResponse.json({
            success: false,
            message: 'MariaDB veri yedekleme başarısız oldu.',
            error: stderr || 'Bilinmeyen hata oluştu',
            backup_type: backupType === 'full' ? 'full_backup' : 'selective_backup'
          }, { status: 500 }));
        }
      });

      backupProcess.on('error', (err) => {
        console.error('💥 Failed to start MariaDB backup:', err);
        resolve(NextResponse.json({
          success: false,
          message: 'MariaDB veri yedekleme başlatılamadı.',
          error: err.message,
          backup_type: backupType === 'full' ? 'full_backup' : 'selective_backup'
        }, { status: 500 }));
      });
    });

  } catch (error) {
    console.error('💥 API Error during MariaDB backup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata oluştu';
    return NextResponse.json({
      success: false,
      message: 'MariaDB veri yedekleme sırasında API hatası.',
      error: errorMessage,
      backup_type: 'full_backup'
    }, { status: 500 });
  }
}