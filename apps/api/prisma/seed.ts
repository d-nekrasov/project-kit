import { PrismaClient, ModuleStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.installation.upsert({
    where: { id: 'default-installation' },
    update: {},
    create: {
      id: 'default-installation',
      isInstalled: false
    }
  });

  await prisma.moduleRegistry.upsert({
    where: { code: 'documents' },
    update: {},
    create: {
      code: 'documents',
      name: 'Documents',
      status: ModuleStatus.ENABLED,
      isCore: false
    }
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
