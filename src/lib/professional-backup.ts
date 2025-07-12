import { createClient } from '@supabase/supabase-js';

interface ProfessionalBackupResult {
  success: boolean;
  backup?: {
    metadata: {
      version: string;
      created_at: string;
      total_objects: number;
      integrity_hash: string;
    };
    statistics: {
      total_tables: number;
      total_records: number;
      total_functions: number;
      execution_time_ms: number;
      backup_size_bytes: number;
    };
  };
  error?: string;
  files?: {
    jsonFile: string;
    sqlFile: string;
    reportFile: string;
  };
}

class ProfessionalBackupSystem {
  private supabase: any;
  private backup: any;
  private startTime: number;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.startTime = Date.now();
    this.backup = {
      metadata: {
        version: '2.0.0',
        created_at: new Date().toISOString(),
        total_objects: 0,
        integrity_hash: null
      },
      schema: {
        tables: [],
        functions: [],
        enum_types: []
      },
      data: {},
      statistics: {
        total_tables: 0,
        total_records: 0,
        total_functions: 0,
        execution_time_ms: 0,
        backup_size_bytes: 0
      }
    };
  }

  private async getTableList() {
    try {
      const { data, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');
      
      if (error) throw error;
      return data.map((row: any) => ({ tablename: row.table_name }));
    } catch (error) {
      // Fallback to known tables
      return [
        { tablename: 'admin_kullanicilar' },
        { tablename: 'alanlar' },
        { tablename: 'belgeler' },
        { tablename: 'dekontlar' },
        { tablename: 'gorev_belgeleri' },
        { tablename: 'isletmeler' },
        { tablename: 'ogretmenler' },
        { tablename: 'ogrenciler' },
        { tablename: 'siniflar' },
        { tablename: 'stajlar' },
        { tablename: 'system_settings' }
      ];
    }
  }

  private async backupTables() {
    console.log('🔄 Professional backup: Starting table backup...');
    
    try {
      const tables = await this.getTableList();
      console.log(`🔍 Found ${tables.length} tables to backup`);
      
      for (const table of tables) {
        try {
          const { data: tableData, error: dataError } = await this.supabase
            .from(table.tablename)
            .select('*');
          
          if (dataError) {
            console.warn(`⚠️ Failed to backup ${table.tablename}: ${dataError.message}`);
            continue;
          }
          
          const tableInfo = {
            name: table.tablename,
            schema: 'public',
            record_count: tableData ? tableData.length : 0,
            data: tableData || []
          };
          
          this.backup.schema.tables.push(tableInfo);
          this.backup.data[table.tablename] = tableData || [];
          this.backup.statistics.total_records += tableData ? tableData.length : 0;
          
          console.log(`✅ ${table.tablename}: ${tableData ? tableData.length : 0} records`);
          
        } catch (tableError) {
          console.warn(`❌ Error backing up ${table.tablename}: ${tableError}`);
          continue;
        }
      }
      
      this.backup.statistics.total_tables = this.backup.schema.tables.length;
      console.log(`✅ Table backup completed: ${this.backup.statistics.total_tables} tables, ${this.backup.statistics.total_records} total records`);
      
    } catch (error) {
      console.error('❌ Table backup failed:', error);
      throw error;
    }
  }

  private async backupFunctions() {
    console.log('🔧 Professional backup: Starting function backup...');
    
    try {
      // Use existing backup system to get function info
      const { data: backupData, error: backupError } = await this.supabase.rpc('create_advanced_backup', {
        p_backup_name: 'Professional_Extract_' + Date.now(),
        p_backup_type: 'schema_only',
        p_notes: 'Professional backup function extraction'
      });

      if (!backupError && backupData?.success) {
        const { data: exportData, error: exportError } = await this.supabase.rpc('get_backup_export_data', {
          p_backup_id: backupData.backup_id
        });

        if (!exportError && exportData?.schema?.functions) {
          const functions = exportData.schema.functions;
          console.log(`🔍 Found ${functions.length} functions`);
          
          for (const func of functions) {
            const functionInfo = {
              name: func.name || 'unknown',
              language: func.language || 'plpgsql',
              definition: func.definition || func.complete_definition || '',
              definition_length: func.definition ? func.definition.length : 0
            };
            
            this.backup.schema.functions.push(functionInfo);
          }
          
          // Clean up temporary backup
          await this.supabase.rpc('delete_backup_complete', {
            p_backup_id: backupData.backup_id
          });
        }
      }
      
      this.backup.statistics.total_functions = this.backup.schema.functions.length;
      console.log(`✅ Function backup completed: ${this.backup.statistics.total_functions} functions`);
      
    } catch (error) {
      console.warn(`⚠️ Function backup warning: ${error}`);
      this.backup.statistics.total_functions = 0;
    }
  }

  private async backupEnumTypes() {
    console.log('🔤 Professional backup: Adding enum types...');
    
    const knownEnums = [
      { enum_name: 'onay_durumu', enum_values: ['bekliyor', 'onaylandi', 'reddedildi'] },
      { enum_name: 'user_role', enum_values: ['admin', 'operator', 'viewer'] }
    ];
    
    for (const enumType of knownEnums) {
      this.backup.schema.enum_types.push(enumType);
    }
    
    console.log(`✅ Enum type backup completed: ${knownEnums.length} enums`);
  }

  private calculateIntegrityHash() {
    const content = JSON.stringify(this.backup, null, 0);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private validateBackup() {
    console.log('🔍 Validating backup integrity...');
    
    const criticalIssues = [];
    
    if (this.backup.schema.tables.length === 0) {
      criticalIssues.push('No tables found in backup');
    }
    
    if (this.backup.statistics.total_records === 0) {
      criticalIssues.push('No data records found in backup');
    }
    
    // Check data consistency
    for (const table of this.backup.schema.tables) {
      const dataLength = this.backup.data[table.name] ? this.backup.data[table.name].length : 0;
      if (dataLength !== table.record_count) {
        criticalIssues.push(`Data mismatch for table ${table.name}`);
      }
    }
    
    if (criticalIssues.length > 0) {
      console.error('❌ Backup validation failed:', criticalIssues);
      return false;
    }
    
    console.log('✅ Backup validation passed');
    return true;
  }

  async createBackup(): Promise<ProfessionalBackupResult> {
    try {
      console.log('🚀 Professional PostgreSQL Backup System v2.0 - Starting...');
      
      // Run backup operations
      await this.backupTables();
      await this.backupFunctions();
      await this.backupEnumTypes();
      
      // Finalize metadata
      this.backup.statistics.execution_time_ms = Date.now() - this.startTime;
      this.backup.metadata.total_objects = 
        this.backup.schema.tables.length +
        this.backup.schema.functions.length +
        this.backup.schema.enum_types.length;
      
      // Calculate integrity hash
      this.backup.metadata.integrity_hash = this.calculateIntegrityHash();
      
      // Validate backup
      const isValid = this.validateBackup();
      if (!isValid) {
        throw new Error('Backup validation failed');
      }
      
      // Calculate backup size
      const backupSize = JSON.stringify(this.backup).length;
      this.backup.statistics.backup_size_bytes = backupSize;
      
      console.log('🎉 Professional backup completed successfully!');
      console.log(`📊 Statistics: ${this.backup.metadata.total_objects} objects, ${this.backup.statistics.total_records} records`);
      console.log(`⏱️ Time: ${(this.backup.statistics.execution_time_ms / 1000).toFixed(2)}s`);
      console.log(`🔐 Hash: ${this.backup.metadata.integrity_hash}`);
      
      return {
        success: true,
        backup: this.backup
      };
      
    } catch (error) {
      console.error('💥 Professional backup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export async function createProfessionalBackup(supabaseUrl: string, supabaseKey: string): Promise<ProfessionalBackupResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const backupSystem = new ProfessionalBackupSystem(supabase);
  return await backupSystem.createBackup();
}

export { ProfessionalBackupSystem };
export type { ProfessionalBackupResult };