# Database Setup for BidBop

## Prerequisites

1. **PostgreSQL Database**: Make sure you have PostgreSQL installed and running
2. **Node.js Dependencies**: Install the required packages

## Installation

### 1. Install PostgreSQL Dependencies

```bash
npm install pg @types/pg
```

### 2. Environment Variables

Create a `.env.local` file in your project root with:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/bidbop_db
```

Replace with your actual database credentials:
- `username`: Your PostgreSQL username
- `password`: Your PostgreSQL password  
- `localhost:5432`: Your database host and port
- `bidbop_db`: Your database name

### 3. Create Database

Connect to PostgreSQL and create the database:

```sql
CREATE DATABASE bidbop_db;
```

### 4. Run Schema

Execute the schema file to create tables:

```bash
psql -d bidbop_db -f lib/database/schema.sql
```

Or connect to your database and run the SQL from `schema.sql`:

```sql
-- Copy and paste the contents of schema.sql here
```

## Database Schema

The database includes:

- **collections table**: Stores deployed collection data
- **Indexes**: For optimal query performance
- **Triggers**: Auto-update timestamps
- **Views**: Easy querying with chain information
- **Constraints**: Data validation

## Usage

The database utilities are available in `lib/database/collections.ts`:

```typescript
import { saveCollection, getCollectionsByOwner } from '@/lib/database/collections';

// Save a new collection
const collection = await saveCollection(collectionData);

// Get collections by owner
const collections = await getCollectionsByOwner('0x...');
```

## API Endpoints

- `POST /api/parse-deployment`: Parse transaction receipt
- `POST /api/save-deployment`: Save deployment to database

## Supported Chains

The system supports multiple blockchains with their specific explorers:

- Ethereum Mainnet (1)
- Ethereum Sepolia Testnet (11155111)
- Polygon Mainnet (137)
- Optimism Mainnet (10)
- Arbitrum One (42161)
- Base Mainnet (8453)
- Monad Testnet (10143)

## Troubleshooting

### Connection Issues
- Verify your `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check firewall settings

### Schema Issues
- Make sure you have the correct permissions
- Verify the database exists
- Check for any existing conflicting tables
