import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(): Promise<Response> {
  try {
    // Use ultimate complete backup - 22 tables + schema + RPC functions
    const scriptPath = path.join(process.cwd(), 'scripts', 'ultimate-complete-backup.js');

    if (!fs.existsSync(scriptPath)) {
      console.error(`❌ Professional backup script not found at: ${scriptPath}`);
      return NextResponse.json({ success: false, message: 'Professional backup script not found.' }, { status: 500 });
    }
    
    console.log(`🚀 Executing Professional backup system: ${scriptPath}`);
    
    // Execute the professional backup script
    const command = `node "${scriptPath}"`;
    
    return new Promise<Response>((resolve) => {
      const backupProcess = exec(command, { maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer for large outputs

      let stdout = '';
      let stderr = '';

      backupProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`Professional backup: ${output}`);
        stdout += output;
      });

      backupProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        console.error(`Professional backup warning: ${error}`);
        stderr += error;
      });

      backupProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Professional backup completed successfully.');
          
          // Extract file information from ultimate backup output
          const jsonFileMatch = stdout.match(/JSON:\s*([^\s]+)/);
          const sqlFileMatch = stdout.match(/SQL:\s*([^\s]+)/);
          const reportFileMatch = stdout.match(/Report:\s*([^\s]+)/);
          
          // Extract comprehensive statistics from ultimate backup
          const tablesMatch = stdout.match(/Tables:\s*(\d+)\/(\d+)/);
          const recordsMatch = stdout.match(/Records:\s*(\d+)/);
          const rpcFunctionsMatch = stdout.match(/RPC Functions:\s*(\d+)\/(\d+)/);
          const schemaObjectsMatch = stdout.match(/Schema Objects:\s*(\d+)/);
          const sizeMatch = stdout.match(/Size:\s*([\d.]+)\s*MB/);
          
          // Extract backup completion details
          const tableBackupMatch = stdout.match(/Table backup completed:\s*(\d+)\/(\d+)\s*tables/);
          const rpcBackupMatch = stdout.match(/RPC backup completed:\s*(\d+)\s*functions tested/);
          const triggersMatch = stdout.match(/(\d+)\s*triggers/);
          const indexesMatch = stdout.match(/(\d+)\s*indexes/);
          const policiesMatch = stdout.match(/(\d+)\s*policies/);
          
          // Check if all tables were successful
          const allTablesSuccess = stdout.includes('ALL TABLES BACKED UP SUCCESSFULLY!');
          
          resolve(NextResponse.json({
            success: true,
            message: 'Ultimate Complete Backup created successfully!',
            backup_type: 'ultimate_complete',
            files: {
              jsonFile: jsonFileMatch ? path.basename(jsonFileMatch[1].trim()) : null,
              sqlFile: sqlFileMatch ? path.basename(sqlFileMatch[1].trim()) : null,
              reportFile: reportFileMatch ? path.basename(reportFileMatch[1].trim()) : null
            },
            statistics: {
              total_tables: tablesMatch ? parseInt(tablesMatch[2]) : 0,
              successful_tables: tablesMatch ? parseInt(tablesMatch[1]) : 0,
              total_records: recordsMatch ? parseInt(recordsMatch[1]) : 0,
              total_rpc_functions: rpcFunctionsMatch ? parseInt(rpcFunctionsMatch[2]) : 0,
              working_rpc_functions: rpcFunctionsMatch ? parseInt(rpcFunctionsMatch[1]) : 0,
              schema_objects: schemaObjectsMatch ? parseInt(schemaObjectsMatch[1]) : 0,
              triggers: triggersMatch ? parseInt(triggersMatch[1]) : 0,
              indexes: indexesMatch ? parseInt(indexesMatch[1]) : 0,
              rls_policies: policiesMatch ? parseInt(policiesMatch[1]) : 0,
              backup_size_mb: sizeMatch ? parseFloat(sizeMatch[1]) : 0,
              success_rate: tablesMatch ? Math.round((parseInt(tablesMatch[1]) / parseInt(tablesMatch[2])) * 100) : 0
            },
            features: [
              '22 Real Database Tables',
              'Complete Schema Information',
              'RPC Functions Testing',
              'Triggers & Indexes',
              'RLS Policies (35 policies)',
              'Function Definitions',
              'Comprehensive Validation',
              'JSON + SQL + Report formats',
              'Ultimate Completeness'
            ],
            validation: {
              all_tables_backed_up: allTablesSuccess,
              table_completion_rate: tablesMatch ? `${tablesMatch[1]}/${tablesMatch[2]}` : '0/0',
              rpc_function_rate: rpcFunctionsMatch ? `${rpcFunctionsMatch[1]}/${rpcFunctionsMatch[2]}` : '0/0'
            },
            output: stdout
          }));
        } else {
          console.error(`❌ Professional backup failed with code ${code}.`);
          resolve(NextResponse.json({
            success: false,
            message: 'Professional backup failed.',
            error: stderr || 'Unknown error occurred',
            backup_type: 'professional_full'
          }, { status: 500 }));
        }
      });

      backupProcess.on('error', (err) => {
        console.error('💥 Failed to start professional backup:', err);
        resolve(NextResponse.json({
          success: false,
          message: 'Failed to start professional backup process.',
          error: err.message,
          backup_type: 'professional_full'
        }, { status: 500 }));
      });
    });

  } catch (error) {
    console.error('💥 API Error during professional backup:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({
      success: false,
      message: 'API Error during professional backup.',
      error: errorMessage,
      backup_type: 'professional_full'
    }, { status: 500 });
  }
}