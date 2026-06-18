import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123456';
  const adminName = process.env.ADMIN_NAME ?? 'Administrador';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const password = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password,
        role: 'ADMIN',
        color: '#25D366',
      },
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  const settingsExist = await prisma.settings.findFirst();
  if (!settingsExist) {
    await prisma.settings.create({
      data: {
        assignmentMode: 'ROUND_ROBIN',
        autoAssign: true,
        slaWarningMinutes: 30,
        slaCriticalMinutes: 60,
      },
    });
    console.log('✅ Default settings created');
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
