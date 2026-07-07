import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from './config';

async function main() {
  console.log('Starting Database Setup...');
  
  // Extract connection details from config or construct connection to default 'postgres' database first
  const dbUrl = config.databaseUrl;
  const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:/]+):?([0-9]*)\/(.+)/);
  
  if (!match) {
    console.error('Invalid DATABASE_URL format in .env');
    process.exit(1);
  }

  const [, user, password, host, portStr, dbName] = match;
  const port = portStr ? parseInt(portStr, 10) : 5432;

  console.log(`Connecting to default "postgres" database on ${host}:${port} as ${user}...`);

  const defaultClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  try {
    await defaultClient.connect();
    
    // Create knowledge_bot database if it doesn't exist
    console.log(`Checking if database "${dbName}" exists...`);
    const dbCheck = await defaultClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (dbCheck.rows.length === 0) {
      console.log(`Database "${dbName}" does not exist. Creating it...`);
      // CREATE DATABASE cannot run inside a transaction block, so we run it directly
      await defaultClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (error) {
    console.error('Error checking/creating database:', (error as Error).message);
    console.log('\n--- IMPORTANT NOTE ---');
    console.log('If you get a password authentication failure locally, please make sure');
    console.log('PostgreSQL is running and the credentials in server/.env are correct.');
    console.log('The setup will proceed to attempt running the schema directly.');
    console.log('----------------------\n');
  } finally {
    await defaultClient.end();
  }

  // Now connect to the actual target database to apply the schema
  console.log(`Connecting to "${dbName}" database to apply schema...`);
  const targetClient = new Client({
    connectionString: dbUrl,
  });

  try {
    await targetClient.connect();
    
    // Load and execute schema.sql
    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    console.log(`Reading schema from ${schemaPath}...`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Applying schema...');
    await targetClient.query(schemaSql);
    console.log('Schema applied successfully.');



    console.log('Database Setup Completed Successfully!');
  } catch (error) {
    console.error('Error applying schema/seed:', error);
    process.exit(1);
  } finally {
    await targetClient.end();
  }
}

main();
