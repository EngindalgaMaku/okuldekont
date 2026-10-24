# Deployment Guide - OCR ve AI Analiz Sistemi

Bu döküman, Okul Dekont OCR ve AI Analiz Sistemi'nin production ortamına deployment sürecini açıklar.

## 🚀 Production Deployment

### 1. Ön Gereksinimler
```bash
# Node.js 22+ gerekli
node --version

# PM2 kurulumu (production process management)
npm install -g pm2

# Database backup
mysqldump -u root -p okul_dekont > backup.sql
```

### 2. Environment Variables
Production `.env` dosyası:
```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/okul_dekont"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-super-secret-key-32-chars-minimum"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"

# Security - Production Values
ANALYSIS_RATE_LIMIT_PER_HOUR=30
BATCH_ANALYSIS_RATE_LIMIT_PER_HOUR=5
MAX_FILE_SIZE_MB=10
MAX_BATCH_SIZE=10

# OCR Settings
OCR_MIN_CONFIDENCE=70
OCR_MAX_TEXT_LENGTH=50000
OCR_WORKER_POOL_SIZE=2

# AI Settings
AI_MIN_RELIABILITY=0.5
AI_MAX_FORGERY_RISK=0.6

# Security
SECURITY_AUDIT_ENABLED=true
SECURITY_LOG_LEVEL=WARNING
AUDIT_LOG_TO_FILE=true
AUDIT_LOG_FILE_PATH="/var/log/okul-dekont/security.log"

# CORS
CORS_ORIGIN="https://yourdomain.com"
CORS_CREDENTIALS=true

# Session
SESSION_MAX_AGE_HOURS=8
COOKIE_SAME_SITE=strict

# Performance
NODE_ENV=production
```

### 3. Build Process
```bash
# Install dependencies
npm ci --only=production

# Build application
npm run build

# Database migration
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate
```

### 4. PM2 Configuration
`ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'okul-dekont-ocr',
    script: 'npm',
    args: 'start',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/okul-dekont/pm2-error.log',
    out_file: '/var/log/okul-dekont/pm2-out.log',
    log_file: '/var/log/okul-dekont/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
}
```

### 5. Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # File upload limits
    client_max_body_size 10M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout for OCR/AI processing
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
    }
    
    # Static files caching
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📊 Monitoring

### 1. Health Checks
`/api/health` endpoint oluşturun:
```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`;
    
    // OpenAI check (optional)
    const openaiHealth = process.env.OPENAI_API_KEY ? 'configured' : 'missing';
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        openai: openaiHealth,
        ocr: 'available'
      }
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: 'Service check failed'
    }, { status: 500 });
  }
}
```

### 2. PM2 Monitoring
```bash
# Start monitoring
pm2 start ecosystem.config.js

# Monitor status
pm2 status
pm2 monit

# Log monitoring
pm2 logs okul-dekont-ocr --lines 100
```

### 3. Log Rotation
```bash
# Setup logrotate for security logs
sudo nano /etc/logrotate.d/okul-dekont

/var/log/okul-dekont/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
```

## 🔒 Security Hardening

### 1. Firewall Rules
```bash
# UFW configuration
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 3000/tcp   # Block direct Node.js access
```

### 2. SSL/TLS Configuration
```bash
# Let's Encrypt with Certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Database Security
```sql
-- Create dedicated database user
CREATE USER 'okul_dekont_app'@'localhost' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON okul_dekont.* TO 'okul_dekont_app'@'localhost';
FLUSH PRIVILEGES;

-- Disable root remote access
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
```

## 📈 Performance Optimization

### 1. Node.js Optimization
```javascript
// next.config.js additions
const nextConfig = {
  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Compression
  compress: true,
  
  // Bundle analyzer (development only)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(new BundleAnalyzerPlugin());
      return config;
    },
  }),
};
```

### 2. Database Optimization
```sql
-- Add indexes for performance
ALTER TABLE Dekont ADD INDEX idx_analyzed (isAnalyzed, analyzedAt);
ALTER TABLE Dekont ADD INDEX idx_reliability (reliabilityScore);
ALTER TABLE Dekont ADD INDEX idx_staj_status (stajId, durum);

-- Optimize OCR results storage
ALTER TABLE Dekont MODIFY COLUMN ocrAnalysisResult JSON;
ALTER TABLE Dekont MODIFY COLUMN aiAnalysisResult JSON;
```

### 3. Caching Strategy
```bash
# Redis setup for session storage
sudo apt install redis-server
sudo systemctl enable redis-server

# Configure Redis in next-auth
REDIS_URL="redis://localhost:6379"
```

## 🚨 Backup Strategy

### 1. Database Backup
```bash
#!/bin/bash
# backup-db.sh
BACKUP_DIR="/var/backups/okul-dekont"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="okul_dekont_backup_$DATE.sql"

mkdir -p $BACKUP_DIR
mysqldump -u backup_user -p okul_dekont > "$BACKUP_DIR/$FILENAME"
gzip "$BACKUP_DIR/$FILENAME"

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Upload to cloud storage (optional)
# aws s3 cp "$BACKUP_DIR/$FILENAME.gz" s3://your-backup-bucket/
```

### 2. File System Backup
```bash
#!/bin/bash
# backup-files.sh
BACKUP_DIR="/var/backups/okul-dekont-files"
SOURCE_DIR="/var/www/okul-dekont"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf "$BACKUP_DIR/files_backup_$DATE.tar.gz" \
    -C $SOURCE_DIR \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=logs \
    .

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### 3. Automated Backup Cron
```bash
# sudo crontab -e
# Database backup every 6 hours
0 */6 * * * /opt/scripts/backup-db.sh

# File backup daily at 2 AM
0 2 * * * /opt/scripts/backup-files.sh

# Log cleanup weekly
0 3 * * 0 find /var/log/okul-dekont -name "*.log" -mtime +7 -delete
```

## 🔍 Troubleshooting

### Common Issues

#### 1. OCR Processing Timeout
```bash
# Check OCR worker pool
pm2 logs okul-dekont-ocr | grep "OCR"

# Increase timeout in nginx
proxy_read_timeout 120s;
```

#### 2. High Memory Usage
```bash
# Monitor memory
pm2 monit

# Restart if memory limit exceeded
pm2 restart okul-dekont-ocr
```

#### 3. OpenAI API Limits
```bash
# Check API usage
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/usage

# Implement exponential backoff in code
```

### Health Check Commands
```bash
# System health
pm2 status
systemctl status nginx
systemctl status mysql

# Application health
curl -f http://localhost:3000/api/health

# Log analysis
tail -f /var/log/okul-dekont/security.log
tail -f /var/log/nginx/access.log
```

## 📞 Support Contacts

### Emergency Contacts
- **System Admin**: admin@yourdomain.com
- **Security Team**: security@yourdomain.com  
- **On-call**: +90-XXX-XXX-XXXX

### Service Providers
- **Hosting**: Your hosting provider
- **SSL Certificate**: Let's Encrypt / Your SSL provider
- **OpenAI Support**: https://help.openai.com/

---

**Deployment Checklist:**
- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Database migrated and secured
- [ ] PM2 process manager configured
- [ ] Nginx reverse proxy setup
- [ ] Firewall rules applied
- [ ] Backup scripts scheduled
- [ ] Monitoring configured
- [ ] Health checks working
- [ ] Security audit completed

**Last Updated**: 2024-01-01  
**Version**: 1.0.0