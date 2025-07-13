import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(): Promise<Response> {
  try {
    // Use simple data-only backup
    const scriptPath = path.join(process.cwd(), 'scripts', 'simple-data-backup.js');

    if (!fs.existsSync(scriptPath)) {
      console.error(`❌ Simple data backup script not found at: ${scriptPath}`);
      return NextResponse.json({ success: false, message: 'Data backup script not found.' }, { status: 500 });
    }
    
    console.log(`🚀 Executing simple data backup: ${scriptPath}`);
    
    // Execute the simple data backup script
    const command = `node "${scriptPath}"`;
    
    return new Promise<Response>((resolve) => {
      const backupProcess = exec(command, { maxBuffer: 5 * 1024 * 1024 }); // 5MB buffer

      let stdout = '';
      let stderr = '';

      backupProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`Data backup: ${output}`);
        stdout += output;
      });

      backupProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        console.error(`Data backup warning: ${error}`);
        stderr += error;
      });

      backupProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Data backup completed successfully.');
          
          // Extract file information from simple backup output
          const jsonFileMatch = stdout.match(/JSON:\s*([^\s]+)/);
          const reportFileMatch = stdout.match(/Report:\s*([^\s]+)/);
          const recordsMatch = stdout.match(/Records:\s*(\d+)/);
          const sizeMatch = stdout.match(/Size:\s*([\d.]+)\s*MB/);
          
          // Check if all tables were successful
          const allTablesSuccess = stdout.includes('TÜM TABLOLAR BAŞARIYLA YEDEKLENDİ!');
          
          resolve(NextResponse.json({
            success: true,
            message: 'Veri yedekleme başarıyla tamamlandı!',
            backupFile: jsonFileMatch ? path.basename(jsonFileMatch[1].trim()) : null,
            reportFile: reportFileMatch ? path.basename(reportFileMatch[1].trim()) : null,
            backup_type: 'data_only',
            statistics: {
              total_records: recordsMatch ? parseInt(recordsMatch[1]) : 0,
              backup_size_mb: sizeMatch ? parseFloat(sizeMatch[1]) : 0,
              all_tables_successful: allTablesSuccess
            },
            note: 'Bu yedek sadece tablo verilerini içerir. SQL yapısı dahil değildir.',
            output: stdout
          }));
        } else {
          console.error(`❌ Data backup failed with code ${code}.`);
          resolve(NextResponse.json({
            success: false,
            message: 'Veri yedekleme başarısız oldu.',
            error: stderr || 'Bilinmeyen hata oluştu',
            backup_type: 'data_only'
          }, { status: 500 }));
        }
      });

      backupProcess.on('error', (err) => {
        console.error('💥 Failed to start data backup:', err);
        resolve(NextResponse.json({
          success: false,
          message: 'Veri yedekleme başlatılamadı.',
          error: err.message,
          backup_type: 'data_only'
        }, { status: 500 }));
      });
    });

  } catch (error) {
    console.error('💥 API Error during data backup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata oluştu';
    return NextResponse.json({
      success: false,
      message: 'Veri yedekleme sırasında API hatası.',
      error: errorMessage,
      backup_type: 'data_only'
    }, { status: 500 });
  }
}