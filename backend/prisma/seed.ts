import { PrismaClient } from '@prisma/client';
import { sembrarEspaciosYContiguedades } from '../src/services/contiguedad.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando siembra de datos de espacios y contigüidades...');
  const resultado = await sembrarEspaciosYContiguedades(prisma);
  console.log(`Siembra completada con éxito:`, resultado);
}

main()
  .catch((e) => {
    console.error('Error durante la siembra de base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
