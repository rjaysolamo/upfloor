# Local Database Setup Guide

This guide will help you set up a local PostgreSQL 15 database for BidBop development.

## Prerequisites

- PostgreSQL 15 installed on your system
- Terminal access

## Installation

### macOS (using Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install postgresql-15
sudo systemctl start postgresql
```

## Quick Setup (Automated)

Run the setup script:

```bash
chmod +x setup-local-db.sh
./setup-local-db.sh
```

This script will:
1. Create a database user `bidbop_user`
2. Create a database `bidbop`
3. Run the schema migration from `schema.sql`
4. Update your `.env.local` file with the connection string

## Manual Setup

If you prefer to set up manually, follow these steps:

### 1. Connect to PostgreSQL

```bash
psql -U postgres
```

### 2. Create Database User

```sql
CREATE USER bidbop_user WITH PASSWORD 'bidbop_dev_password';
ALTER USER bidbop_user CREATEDB;
```

### 3. Create Database

```sql
CREATE DATABASE bidbop OWNER bidbop_user;
GRANT ALL PRIVILEGES ON DATABASE bidbop TO bidbop_user;
\q
```

### 4. Run Schema Migration

```bash
psql -U bidbop_user -d bidbop -f schema.sql
```

### 5. Update Environment Variables

Create or update `.env.local`:

```env
DATABASE_URL="postgresql://bidbop_user:bidbop_dev_password@localhost:5432/bidbop"
```

## Verify Setup

### Check Database Connection

```bash
psql -U bidbop_user -d bidbop
```

### List Tables

```sql
\dt
```

You should see the `collections` table.

### View Table Structure

```sql
\d collections
```

### Test Query

```sql
SELECT COUNT(*) FROM collections;
```

## Useful Commands

### Connect to Database
```bash
psql -U bidbop_user -d bidbop
```

### View All Tables
```sql
\dt
```

### View Table Schema
```sql
\d collections
```

### View Collections with Chain Info
```sql
SELECT * FROM collections_with_chain_info;
```

### Backup Database
```bash
pg_dump -U bidbop_user bidbop > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
psql -U bidbop_user -d bidbop < backup.sql
```

### Drop and Recreate Database (Fresh Start)
```bash
psql -U postgres -c "DROP DATABASE IF EXISTS bidbop;"
psql -U postgres -c "CREATE DATABASE bidbop OWNER bidbop_user;"
psql -U bidbop_user -d bidbop -f schema.sql
```

## Troubleshooting

### PostgreSQL Service Not Running

**macOS:**
```bash
brew services start postgresql@15
```

**Linux:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Start on boot
```

### Permission Denied

If you get permission errors, make sure you're using the correct user:

```bash
# Connect as postgres superuser first
psql -U postgres

# Then grant permissions
GRANT ALL PRIVILEGES ON DATABASE bidbop TO bidbop_user;
```

### Connection Refused

Check if PostgreSQL is listening on the correct port:

```bash
pg_isready -h localhost -p 5432
```

If not running, start the service (see above).

### Password Authentication Failed

Reset the password:

```bash
psql -U postgres
ALTER USER bidbop_user WITH PASSWORD 'bidbop_dev_password';
```

## Development Workflow

### Start Development Server

```bash
npm run dev
```

The app will automatically connect to your local database using the `DATABASE_URL` from `.env.local`.

### View Logs

Check your terminal for database connection logs and any errors.

### Test API Endpoints

Once the server is running, test the collections API:

```bash
curl http://localhost:3000/api/collections
```

## Production vs Development

- **Development**: Uses local PostgreSQL (this setup)
- **Production**: Uses your production database (configured in production environment)

Make sure to:
- Never commit `.env.local` to git
- Use different credentials for production
- Keep your local database separate from production

## Database Schema Updates

When `schema.sql` is updated:

1. Backup your current database:
   ```bash
   pg_dump -U bidbop_user bidbop > backup.sql
   ```

2. Apply the new schema:
   ```bash
   psql -U bidbop_user -d bidbop -f schema.sql
   ```

3. Or start fresh:
   ```bash
   ./setup-local-db.sh
   ```

## Security Notes

- The default password `bidbop_dev_password` is for local development only
- Change it if you're concerned about local security
- Never use these credentials in production
- Add `.env.local` to `.gitignore` (should already be there)

## Support

If you encounter issues:
1. Check PostgreSQL is running: `pg_isready`
2. Verify credentials: `psql -U bidbop_user -d bidbop`
3. Check logs: `tail -f /usr/local/var/log/postgresql@15.log` (macOS)
4. Review the error messages in your terminal

---


