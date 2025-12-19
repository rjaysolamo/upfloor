#!/bin/bash

# =====================================================
# BidBop Database Migration Script
# =====================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔄 BidBop Database Migration Tool"
echo ""

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  setup     - Set up database schema"
    echo "  backup    - Create database backup"
    echo "  restore   - Restore from backup"
    echo "  check     - Check database status"
    echo "  migrate   - Run pending migrations"
    echo ""
    echo "Environments:"
    echo "  dev       - Development (local PostgreSQL)"
    echo "  prod      - Production (Neon PostgreSQL)"
    echo ""
    echo "Examples:"
    echo "  $0 setup dev"
    echo "  $0 backup prod"
    echo "  $0 check dev"
}

# Function to get database URL
get_db_url() {
    local env=$1
    case $env in
        "dev")
            echo "postgresql://yeiterilsosingkoireng@localhost:5432/bidbop_db"
            ;;
        "prod")
            echo "postgresql://neondb_owner:npg_Fh6VHTux7stw@ep-late-heart-ad8b9v6l-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
            ;;
        *)
            echo -e "${RED}❌ Invalid environment: $env${NC}"
            echo "Valid environments: dev, prod"
            exit 1
            ;;
    esac
}

# Function to setup database
setup_db() {
    local env=$1
    local db_url=$(get_db_url $env)
    
    echo -e "${BLUE}📋 Setting up $env database...${NC}"
    echo "  Environment: $env"
    echo "  Database URL: ${db_url:0:50}..."
    echo ""
    
    # Test connection
    echo -e "${YELLOW}🔍 Testing connection...${NC}"
    if psql "$db_url" -c "SELECT version();" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Connection successful${NC}"
    else
        echo -e "${RED}❌ Connection failed${NC}"
        exit 1
    fi
    
    # Apply schema
    echo -e "${YELLOW}📋 Applying schema...${NC}"
    psql "$db_url" -f schema.sql
    
    echo -e "${GREEN}✅ Database setup complete!${NC}"
}

# Function to backup database
backup_db() {
    local env=$1
    local db_url=$(get_db_url $env)
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="backup_${env}_${timestamp}.sql"
    
    echo -e "${BLUE}💾 Creating backup for $env database...${NC}"
    echo "  Backup file: $backup_file"
    echo ""
    
    # Create backup
    pg_dump "$db_url" > "$backup_file"
    
    echo -e "${GREEN}✅ Backup created: $backup_file${NC}"
}

# Function to restore database
restore_db() {
    local env=$1
    local db_url=$(get_db_url $env)
    
    echo -e "${BLUE}📥 Restoring $env database...${NC}"
    echo "Available backup files:"
    ls -la backup_${env}_*.sql 2>/dev/null || echo "  No backup files found"
    echo ""
    
    read -p "Enter backup filename: " backup_file
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌ Backup file not found: $backup_file${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⚠️  This will replace all data in the $env database!${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Restore cancelled"
        exit 0
    fi
    
    # Restore backup
    psql "$db_url" < "$backup_file"
    
    echo -e "${GREEN}✅ Database restored from: $backup_file${NC}"
}

# Function to check database status
check_db() {
    local env=$1
    local db_url=$(get_db_url $env)
    
    echo -e "${BLUE}🔍 Checking $env database status...${NC}"
    echo ""
    
    # Test connection
    if psql "$db_url" -c "SELECT version();" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Connection: OK${NC}"
    else
        echo -e "${RED}❌ Connection: FAILED${NC}"
        exit 1
    fi
    
    # Check tables
    local table_count=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    echo -e "${GREEN}✅ Tables: $table_count${NC}"
    
    # Check collections count
    if [ "$table_count" -gt 0 ]; then
        local collections_count=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM collections;" 2>/dev/null | tr -d ' ' || echo "0")
        echo -e "${GREEN}✅ Collections: $collections_count${NC}"
        
        # Check unique constraints
        local unique_constraints=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM pg_constraint WHERE contype = 'u';" | tr -d ' ')
        echo -e "${GREEN}✅ Unique constraints: $unique_constraints${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Database status: HEALTHY${NC}"
}

# Function to run migrations
migrate_db() {
    local env=$1
    local db_url=$(get_db_url $env)
    
    echo -e "${BLUE}🔄 Running migrations for $env database...${NC}"
    echo ""
    
    # Check migrations directory
    if [ ! -d "migrations" ]; then
        echo -e "${RED}❌ Migrations directory not found${NC}"
        exit 1
    fi
    
    # Run all migration files in order
    for migration_file in migrations/*.sql; do
        if [ -f "$migration_file" ]; then
            echo -e "${YELLOW}📋 Applying migration: $(basename $migration_file)${NC}"
            psql "$db_url" -f "$migration_file"
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Migration applied: $(basename $migration_file)${NC}"
            else
                echo -e "${RED}❌ Migration failed: $(basename $migration_file)${NC}"
                exit 1
            fi
            echo ""
        fi
    done
    
    # Check for old migration files (backwards compatibility)
    if [ -f "lib/database/migration-add-symbol-unique-constraint.sql" ]; then
        echo -e "${YELLOW}📋 Applying legacy symbol uniqueness migration...${NC}"
        psql "$db_url" -f lib/database/migration-add-symbol-unique-constraint.sql
        echo -e "${GREEN}✅ Legacy migration applied${NC}"
        echo ""
    fi
    
    echo -e "${GREEN}✅ All migrations complete!${NC}"
}

# Main script logic
if [ $# -lt 2 ]; then
    show_usage
    exit 1
fi

COMMAND=$1
ENVIRONMENT=$2

case $COMMAND in
    "setup")
        setup_db $ENVIRONMENT
        ;;
    "backup")
        backup_db $ENVIRONMENT
        ;;
    "restore")
        restore_db $ENVIRONMENT
        ;;
    "check")
        check_db $ENVIRONMENT
        ;;
    "migrate")
        migrate_db $ENVIRONMENT
        ;;
    *)
        echo -e "${RED}❌ Invalid command: $COMMAND${NC}"
        show_usage
        exit 1
        ;;
esac
