import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.productType.count();
  if (count === 0) {
    await prisma.productType.createMany({
      data: [
        { name: 'Unidad' },
        { name: 'Kilogramo' },
      ],
    });
    console.log('Tipos de producto iniciales insertados');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
