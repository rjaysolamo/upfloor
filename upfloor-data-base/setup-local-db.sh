#!/bin/bash

# Local PostgreSQL Database Setup Script for BidBop
# This script sets up a local PostgreSQL 15 database for development

set -e

echo "🚀 Setting up BidBop local database..."

# Database configuration
DB_NAME="bidbop"
DB_USER="bidbop_user"
DB_PASSWORD="bidbop_dev_password"
DB_HOST="localhost"
DB_PORT="5432"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW} Database Configuration:${NC}"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED} PostgreSQL is not installed!${NC}"
    echo ""
    echo "Please install PostgreSQL 15:"
    echo "  macOS: brew install postgresql@15"
    echo "  Ubuntu: sudo apt-get install postgresql-15"
    echo ""
    exit 1
fi

# Check PostgreSQL version
PG_VERSION=$(psql --version | grep -oE '[0-9]+' | head -1)
echo -e "${GREEN}✓ PostgreSQL version $PG_VERSION detected${NC}"

# Check if PostgreSQL service is running
if ! pg_isready -h $DB_HOST -p $DB_PORT &> /dev/null; then
    echo -e "${YELLOW} PostgreSQL service is not running${NC}"
    echo ""
    echo "Starting PostgreSQL service..."
    
    # Try to start PostgreSQL based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew services start postgresql@15 || brew services start postgresql
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo systemctl start postgresql
    fi
    
    sleep 2
    
    if ! pg_isready -h $DB_HOST -p $DB_PORT &> /dev/null; then
        echo -e "${RED} Failed to start PostgreSQL service${NC}"
        echo "Please start it manually and run this script again."
        exit 1
    fi
fi

echo -e "${GREEN}✓ PostgreSQL service is running${NC}"

# Create database user
echo ""
echo -e "${YELLOW}👤 Creating database user...${NC}"

# Check if user already exists
USER_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null || echo "")

if [ "$USER_EXISTS" = "1" ]; then
    echo -e "${YELLOW}  User '$DB_USER' already exists${NC}"
    read -p "Do you want to drop and recreate the user? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        psql -h $DB_HOST -p $DB_PORT -U postgres -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
        echo -e "${GREEN}✓ Dropped existing user${NC}"
    fi
fi

# Create user if it doesn't exist
psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo -e "${YELLOW}⚠️  User already exists, skipping creation${NC}"
psql -h $DB_HOST -p $DB_PORT -U postgres -c "ALTER USER $DB_USER CREATEDB;" 2>/dev/null

echo -e "${GREEN}✓ User '$DB_USER' is ready${NC}"

# Create database
echo ""
echo -e "${YELLOW}🗄️  Creating database...${NC}"

# Check if database already exists
DB_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${YELLOW}  Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to drop and recreate the database? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        psql -h $DB_HOST -p $DB_PORT -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
        echo -e "${GREEN}✓ Dropped existing database${NC}"
        DB_EXISTS=""
    fi
fi

if [ "$DB_EXISTS" != "1" ]; then
    psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null
    echo -e "${GREEN}✓ Database '$DB_NAME' created${NC}"
fi

# Grant privileges
psql -h $DB_HOST -p $DB_PORT -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null
echo -e "${GREEN}✓ Privileges granted${NC}"

# Run schema migration
echo ""
echo -e "${YELLOW} Running schema migration...${NC}"

if [ ! -f "schema.sql" ]; then
    echo -e "${RED} schema.sql file not found!${NC}"
    exit 1
fi

# Execute schema
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schema.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Schema migration completed successfully${NC}"
else
    echo -e "${RED}x Schema migration failed${NC}"
    exit 1
fi

# Create .env.local file
echo ""
echo -e "${YELLOW} Creating .env.local file...${NC}"

DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

if [ -f ".env.local" ]; then
    # Backup existing .env.local
    cp .env.local .env.local.backup
    echo -e "${YELLOW}  Backed up existing .env.local to .env.local.backup${NC}"
fi

# Check if DATABASE_URL already exists in .env.local
if [ -f ".env.local" ] && grep -q "^DATABASE_URL=" .env.local; then
    # Update existing DATABASE_URL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env.local
    else
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env.local
    fi
    echo -e "${GREEN}✓ Updated DATABASE_URL in .env.local${NC}"
else
    # Append DATABASE_URL
    echo "" >> .env.local
    echo "# Local PostgreSQL Database" >> .env.local
    echo "DATABASE_URL=\"$DATABASE_URL\"" >> .env.local
    echo -e "${GREEN}✓ Added DATABASE_URL to .env.local${NC}"
fi

# Verify connection
echo ""
echo -e "${YELLOW} Verifying database connection...${NC}"

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database connection verified${NC}"
else
    echo -e "${RED}x Failed to connect to database${NC}"
    exit 1
fi

# Display summary
echo ""
echo -e "${GREEN}Setup completed successfully!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN} Database Connection Details:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo ""
echo "  Connection String:"
echo "  $DATABASE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW} Next Steps:${NC}"
echo "  1. Your .env.local file has been updated with DATABASE_URL"
echo "  2. Restart your development server: npm run dev"
echo "  3. Test the database connection in your app"
echo ""
echo -e "${YELLOW} Useful Commands:${NC}"
echo "  Connect to database:"
echo "    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
echo ""
echo "  View tables:"
echo "    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\\dt'"
echo ""
echo "  Backup database:"
echo "    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME > backup.sql"
echo ""
echo "  Restore database:"
echo "    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < backup.sql"
echo ""
