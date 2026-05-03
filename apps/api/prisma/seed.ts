import { PrismaClient, ModuleStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.installation.upsert({
    where: { id: 'default-installation' },
    update: {},
    create: {
      id: 'default-installation',
      installed: false
    }
  });

  await prisma.moduleRegistry.upsert({
    where: { name: 'documents' },
    update: {},
    create: {
      name: 'documents',
      title: 'Documents',
      version: '0.1.0',
      description: 'Document management module',
      status: ModuleStatus.ENABLED,
      manifest: {
        name: 'documents',
        title: 'Documents',
        version: '0.1.0'
      },
      installedAt: new Date()
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
