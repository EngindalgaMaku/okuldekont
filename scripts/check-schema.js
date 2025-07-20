#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSchema() {
    try {
        console.log('🔍 MariaDB Schema Analizi...\n');
        
        // Stored Procedures
        const procedures = await prisma.$queryRaw`
            SELECT ROUTINE_NAME, ROUTINE_TYPE, ROUTINE_DEFINITION 
            FROM information_schema.ROUTINES 
            WHERE ROUTINE_SCHEMA = DATABASE()
        `;
        console.log('📋 Stored Procedures/Functions:', procedures.length);
        procedures.forEach(p => console.log(`  - ${p.ROUTINE_NAME} (${p.ROUTINE_TYPE})`));
        
        // Triggers
        const triggers = await prisma.$queryRaw`
            SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE 
            FROM information_schema.TRIGGERS 
            WHERE TRIGGER_SCHEMA = DATABASE()
        `;
        console.log('\n🔧 Triggers:', triggers.length);
        triggers.forEach(t => console.log(`  - ${t.TRIGGER_NAME} on ${t.EVENT_OBJECT_TABLE}`));
        
        // Views
        const views = await prisma.$queryRaw`
            SELECT TABLE_NAME, VIEW_DEFINITION 
            FROM information_schema.VIEWS 
            WHERE TABLE_SCHEMA = DATABASE()
        `;
        console.log('\n👁️ Views:', views.length);
        views.forEach(v => console.log(`  - ${v.TABLE_NAME}`));
        
        // Tables (schema info)
        const tables = await prisma.$queryRaw`
            SELECT TABLE_NAME, TABLE_TYPE 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
        `;
        console.log('\n🗂️ Tables:', tables.length);
        tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));
        
    } catch (error) {
        console.error('❌ Schema analizi hatası:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema().catch(console.error);