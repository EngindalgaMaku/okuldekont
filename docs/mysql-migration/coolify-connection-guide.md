# Coolify MariaDB Connection Guide

## 🔧 Connection Issue Analysis

The database connection is failing because:
- **Local Development**: Your Next.js app is running locally (`localhost:3000`)
- **Containerized Database**: MariaDB is running in Coolify container
- **Network Isolation**: Local app cannot reach container's internal network

## 🚀 Solution Options

### Option 1: Use Host Machine IP (Recommended)

Find your host machine's IP address and use port 5433:

```bash
# Windows
ipconfig | findstr IPv4

# macOS/Linux
ifconfig | grep inet
```

Then update `.env`:
```env
DATABASE_URL="mysql://mariadb:kQ28Z33QH1uO71S8iSfieQrFmpiRB56bEDyYLbKM0QZ4PWtozZxbkiPCbl8jhOyJ@[YOUR_HOST_IP]:5433/default"
```

### Option 2: Deploy Next.js App to Coolify

Deploy your Next.js app as a container in Coolify so both apps can communicate internally:

```env
# For containerized app in Coolify
DATABASE_URL="mysql://mariadb:kQ28Z33QH1uO71S8iSfieQrFmpiRB56bEDyYLbKM0QZ4PWtozZxbkiPCbl8jhOyJ@mariadb-okuldekont:3306/default"
```

### Option 3: Enable Public Access

In Coolify MariaDB settings:
1. Go to "Network" section
2. Enable "Make it publicly available"
3. Use the public URL provided

### Option 4: Use Docker Host Network

If running Docker locally, use host network:
```env
DATABASE_URL="mysql://mariadb:kQ28Z33QH1uO71S8iSfieQrFmpiRB56bEDyYLbKM0QZ4PWtozZxbkiPCbl8jhOyJ@host.docker.internal:5433/default"
```

## 🛠️ Environment Configuration Templates

### Local Development (.env.local)
```env
# MariaDB Database Connection (Local Development)
DATABASE_URL="mysql://mariadb:kQ28Z33QH1uO71S8iSfieQrFmpiRB56bEDyYLbKM0QZ4PWtozZxbkiPCbl8jhOyJ@[HOST_IP]:5433/default"

# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=okul-dekont-nextauth-secret-key-2025
```

### Production/Coolify (.env.production)
```env
# MariaDB Database Connection (Coolify Internal)
DATABASE_URL="mysql://mariadb:kQ28Z33QH1uO71S8iSfieQrFmpiRB56bEDyYLbKM0QZ4PWtozZxbkiPCbl8jhOyJ@mariadb-okuldekont:3306/default"

# NextAuth.js Configuration
NEXTAUTH_URL=https://your-app-domain.com
NEXTAUTH_SECRET=your-production-secret
```

## 🔍 Connection Testing

### Test 1: Basic Network Connectivity
```bash
# Test if port 5433 is accessible
telnet localhost 5433
# or
nc -zv localhost 5433
```

### Test 2: MySQL Connection
```bash
# Using MySQL client (if installed)
mysql -h localhost -P 5433 -u mariadb -p default
```

### Test 3: Prisma Connection
```bash
# Test with our script
node scripts/test-db-connection.js
```

## 📋 Troubleshooting Steps

1. **Check Container Status**
   - Verify MariaDB container is running in Coolify
   - Check container logs for errors

2. **Verify Port Binding**
   - Ensure port 5433 is properly mapped
   - Check firewall settings

3. **Test Network Access**
   - Try connecting with MySQL client
   - Use telnet/nc to test port accessibility

4. **Check Database Credentials**
   - Verify username: `mariadb`
   - Verify password: `kQ28Z33QH1uO71S8iSfieQrFmpiRB56bEDyYLbKM0QZ4PWtozZxbkiPCbl8jhOyJ`
   - Verify database: `default`

## 🎯 Recommended Workflow

### For Development:
1. Use Option 1 (Host IP) for local development
2. Test connection with our script
3. Run migrations once connected
4. Continue development locally

### For Production:
1. Deploy Next.js app to Coolify
2. Use internal container networking
3. Set up proper environment variables
4. Test in production environment

## 📞 Quick Fix Commands

```bash
# Find your host IP (Windows)
ipconfig | findstr IPv4

# Update .env with host IP
echo 'DATABASE_URL="mysql://mariadb:kQ28Z33QH1uO71S8iSfieQrFmpiRB56bEDyYLbKM0QZ4PWtozZxbkiPCbl8jhOyJ@192.168.1.100:5433/default"' > .env

# Test connection
node scripts/test-db-connection.js

# Initialize database
npx prisma migrate dev --name init
```

## ✅ Success Indicators

Once connected successfully:
- ✅ Connection test passes
- ✅ Prisma migrations run
- ✅ Database schema created
- ✅ Application can authenticate users
- ✅ Data operations work correctly

The Prisma setup is complete and ready - only the network connection needs to be configured for your specific environment.