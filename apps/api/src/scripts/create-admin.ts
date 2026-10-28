import 'dotenv/config';
import { confirm, input, password } from '@inquirer/prompts';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, AdminRole } from '../generated/prisma-client/client.js';
import * as argon2 from 'argon2';
import { validateEnvironment } from '../config/environment.js';

async function createFirstAdmin(): Promise<void> {
  const env = validateEnvironment(process.env);
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    const email = (await input({ message: 'Admin email:' })).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Enter a valid email address.');
    const enteredPassword = await password({ message: 'Password (at least 12 characters):' });
    if (enteredPassword.length < 12 || enteredPassword.length > 128 || Buffer.byteLength(enteredPassword, 'utf8') > 1024) throw new Error('Password must be 12–128 characters and at most 1024 UTF-8 bytes.');
    const confirmation = await password({ message: 'Confirm password:' });
    if (enteredPassword !== confirmation) throw new Error('Passwords did not match.');
    const passwordHash = await argon2.hash(enteredPassword, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
    await prisma.$transaction(async transaction => {
      await transaction.$executeRaw`LOCK TABLE "AdminUser" IN EXCLUSIVE MODE`;
      if (await transaction.adminUser.count() > 0) throw new Error('An admin account already exists.');
      await transaction.adminUser.create({ data: { email, passwordHash, role: AdminRole.SUPER_ADMIN } });
    });
    console.log('First administrator created. Store the credentials securely.');
  } finally {
    await prisma.$disconnect();
  }
}

createFirstAdmin().catch(() => {
  console.error('Administrator bootstrap failed. Verify the database schema/configuration; detailed errors are omitted.');
  process.exitCode = 1;
});
