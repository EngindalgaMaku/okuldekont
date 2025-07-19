# Local Development Database Setup

## 🚀 Quick Setup Guide

### 1. Start Local Database
```bash
# Start MariaDB container
docker-compose up -d mariadb

# Wait for database to be ready (30 seconds)
# Check if database is running
docker-compose ps
```

### 2. Initialize Database Schema
```bash
# Run Prisma migrations to create tables
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 3. Seed Database (Optional)
```bash
# If you have seed data, run:
npm run seed

# Or create a basic admin user:
npm run create-admin
```

### 4. Start Development Server
```bash
npm run dev
```

## 🔧 Database Access

### Via phpMyAdmin
- URL: http://localhost:8080
- Username: dev_user
- Password: dev_password_123
- Database: okul_dekont_dev

### Via MySQL CLI
```bash
mysql -h localhost -P 3307 -u dev_user -p okul_dekont_dev
# Password: dev_password_123
```

## 📋 Connection Details

- **Host**: localhost
- **Port**: 3307 (to avoid conflicts with system MySQL)
- **Database**: okul_dekont_dev
- **Username**: dev_user
- **Password**: dev_password_123
- **Root Password**: root_password_123

## 🛠️ Troubleshooting

### Database Connection Issues
```bash
# Check if container is running
docker-compose ps

# Check container logs
docker-compose logs mariadb

# Restart database
docker-compose restart mariadb

# Reset database (WARNING: Deletes all data)
docker-compose down -v
docker-compose up -d mariadb
```

### Port Conflicts
If port 3307 is already in use, modify `docker-compose.yml`:
```yaml
ports:
  - "3308:3306"  # Change to available port
```

And update `.env.local`:
```env
DATABASE_URL="mysql://dev_user:dev_password_123@localhost:3308/okul_dekont_dev"
```

## 🔄 Environment Switching

### Local Development
Use `.env.local` with:
```env
DATABASE_URL="mysql://dev_user:dev_password_123@localhost:3307/okul_dekont_dev"
```

### Production (Coolify)
Use environment variables in Coolify dashboard:
```env
DATABASE_URL="mysql://mariadb:kQ28Z33QH1uO71S8iSfieQrFmpiRB56bEDyYLbKM0QZ4PWtozZxbkiPCbl8jhOyJ@okuldb.run.place:3306/default"
```

## ✅ Verification

Test database connection:
```bash
node scripts/test-production-db.js
```

Or visit: http://localhost:3000/api/health/database