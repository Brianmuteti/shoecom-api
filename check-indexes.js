const { PrismaClient } = require('./generated/prisma/client');

const prisma = new PrismaClient();

async function checkIndexes() {
   try {
      // Check all indexes on ProductMedia table
      const indexes = await prisma.$queryRaw`
            SELECT 
                indexname,
                indexdef
            FROM pg_indexes 
            WHERE tablename = 'ProductMedia'
        `;

      console.log('Indexes on ProductMedia table:');
      console.log(indexes);

      // Check current records
      const records = await prisma.productMedia.findMany();
      console.log('Current ProductMedia records:');
      records.forEach(r => {
         console.log(`ID: ${r.id}, ProductID: ${r.productId}, isThumbnail: ${r.isThumbnail}, URL: ${r.url.substring(0, 50)}...`);
      });

   } catch (error) {
      console.error('Error:', error);
   } finally {
      await prisma.$disconnect();
   }
}

checkIndexes();
