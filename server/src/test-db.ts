import { Client } from 'pg';

const passwords = ['1', 'postgres', 'admin', 'root', 'password', '123456', '123', '1234', 'password123', 'postgres123'];

async function testPassword(password: string): Promise<boolean> {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log(`\n>>> SUCCESS! Password is: "${password}"`);
    await client.end();
    return true;
  } catch (error) {
    process.stdout.write('.');
    return false;
  }
}

async function main() {
  console.log('Testing passwords for user "postgres" on port 5432...');
  for (const pwd of passwords) {
    const ok = await testPassword(pwd);
    if (ok) return;
  }
  console.log('\nAll tested passwords failed.');
}

main();
