# Migration Safety Guide

This guide provides tools and best practices to prevent and resolve Prisma migration conflicts in the okul-dekont project.

## 🚨 The Problem

The project experienced several migration failures due to schema drift - where the actual database schema didn't match Prisma's migration state. This caused errors like:

- `Duplicate key name 'idx_internships_filter_composite'`
- `Duplicate column name 'sequenceNumber'`
- `Table 'student_history' already exists`

## 🛠️ Solution Tools

### 1. Migration Conflict Resolver

**File:** `scripts/fix-migration-conflicts.js`

**Purpose:** Automatically detects and resolves migration conflicts by comparing database schema with migration files.

**Usage:**

```bash
node scripts/fix-migration-conflicts.js
```

**What it does:**

- Checks current database schema (indexes, columns, tables, constraints)
- Compares with failed migration requirements
- Creates missing objects if they don't exist
- Marks migrations as completed in `_prisma_migrations` table
- Generates detailed report

### 2. Migration Resolution Tester

**File:** `scripts/test-migration-resolution.js`

**Purpose:** Validates that migration conflicts were successfully resolved.

**Usage:**

```bash
node scripts/test-migration-resolution.js
```

**What it tests:**

- Performance indexes functionality
- New columns (sequenceNumber, companyType)
- New tables (student_history)
- Migration state consistency
- Database query performance

### 3. Migration Safety System

**File:** `scripts/migration-safety-system.js`

**Purpose:** Prevents future migration conflicts with pre-migration checks.

**Usage:**

```bash
node scripts/migration-safety-system.js
```

**What it checks:**

- Current migration state health
- Potential conflicts in pending migrations
- Creates safety backups
- Provides go/no-go decision for migrations

## 🎯 Best Practices

### Before Creating Migrations

1. **Always run the safety check:**

   ```bash
   node scripts/migration-safety-system.js
   ```

2. **Check current schema:**

   ```bash
   npx prisma db pull --print
   ```

3. **Validate your Prisma schema:**
   ```bash
   npx prisma validate
   ```

### When Creating Migrations

1. **Use descriptive names:**

   ```bash
   npx prisma migrate dev --name "add_student_performance_indexes"
   ```

2. **Review migration file before applying:**

   - Check for CREATE statements that might conflict
   - Verify column additions don't duplicate existing columns
   - Ensure index names are unique

3. **Test locally first:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

### Before Deploying to Production

1. **Run complete safety check:**

   ```bash
   node scripts/migration-safety-system.js
   ```

2. **Create manual backup:**

   ```bash
   # Use your backup system or database tools
   mysqldump -u user -p database > backup-$(date +%Y%m%d).sql
   ```

3. **Deploy with monitoring:**

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. **Verify deployment:**
   ```bash
   node scripts/test-migration-resolution.js
   ```

## 🚨 Emergency Recovery

If migrations fail in production:

### Step 1: Assess the Situation

```bash
# Check migration state
npx prisma migrate status

# Check database logs
# Review error messages in _prisma_migrations table
```

### Step 2: Fix Migration Conflicts

```bash
# Run the conflict resolver
node scripts/fix-migration-conflicts.js

# Verify the fix
node scripts/test-migration-resolution.js
```

### Step 3: Complete Migration Process

```bash
# Generate Prisma client
npx prisma generate

# Deploy remaining migrations
npx prisma migrate deploy

# Final verification
node scripts/test-migration-resolution.js
```

## 📋 Migration Checklist

- [ ] Run pre-migration safety check
- [ ] Review migration SQL for potential conflicts
- [ ] Test migration in development environment
- [ ] Create database backup
- [ ] Deploy migration with monitoring
- [ ] Verify migration success
- [ ] Update team on migration status

## 🔍 Common Migration Conflicts

### Index Already Exists

**Error:** `Duplicate key name 'index_name'`
**Solution:** Check if index exists before creating, or use `CREATE INDEX IF NOT EXISTS`

### Column Already Exists

**Error:** `Duplicate column name 'column_name'`
**Solution:** Use conditional ALTER TABLE or check column existence first

### Table Already Exists

**Error:** `Table 'table_name' already exists`
**Solution:** Use `CREATE TABLE IF NOT EXISTS` or check table existence

### Constraint Already Exists

**Error:** `Duplicate key name 'constraint_name'`
**Solution:** Check constraint existence before adding

## 📊 Monitoring

### Key Metrics to Monitor

- Migration success rate
- Database schema consistency
- Performance impact of new indexes
- Query performance improvements

### Log Files

- `migration-safety.log` - Safety system logs
- `migration-fix-report.json` - Conflict resolution report
- `migration-resolution-test-report.json` - Test results
- `migration-safety-report.json` - Pre-migration check results

## 🎉 Success Metrics

After resolving the migration conflicts:

✅ **All 4 failed migrations resolved:**

- `20251001_add_performance_indexes` ✅
- `20251002_add_sequence_number_to_dekont` ✅
- `20251003_add_company_type` ✅
- `20250730_add_student_history` ✅

✅ **Database performance improved:**

- Performance indexes working (60-70% query improvement expected)
- Company type filtering available
- Sequence number system for dekonts functional
- Student history tracking operational

✅ **Migration safety system in place:**

- Pre-migration conflict detection
- Automated resolution tools
- Comprehensive testing framework

## 🚀 Future Improvements

1. **Automated CI/CD Integration:** Add migration safety checks to deployment pipeline
2. **Schema Versioning:** Implement schema version tracking
3. **Performance Monitoring:** Add query performance metrics
4. **Rollback Procedures:** Create automated rollback scripts
5. **Team Training:** Document migration best practices for all developers

---

**Remember:** Always test migrations in development before production deployment!
