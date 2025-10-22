const { PrismaClient } = require('./generated/prisma/client');

const prisma = new PrismaClient();

async function checkMediaRecords() {
   try {
      console.log('Checking ProductMedia records...');

      // Get all records
      const allRecords = await prisma.productMedia.findMany();
      console.log('Total records:', allRecords.length);

      // Group by productId and isThumbnail
      const grouped = allRecords.reduce((acc, record) => {
         const key = `${record.productId}-${record.isThumbnail}`;
         if (!acc[key]) acc[key] = [];
         acc[key].push(record);
         return acc;
      }, {});

      console.log('Grouped records:');
      Object.entries(grouped).forEach(([key, records]) => {
         console.log(`  ${key}: ${records.length} records`);
         records.forEach(r => {
            console.log(`    - ID: ${r.id}, URL: ${r.url.substring(0, 50)}..., isThumbnail: ${r.isThumbnail}`);
         });
      });

      // Check for constraint violations
      const violations = Object.entries(grouped).filter(([key, records]) => {
         const [productId, isThumbnail] = key.split('-');
         return isThumbnail === 'true' && records.length > 1;
      });

      if (violations.length > 0) {
         console.log('CONSTRAINT VIOLATIONS FOUND:');
         violations.forEach(([key, records]) => {
            console.log(`  Product ${key.split('-')[0]} has ${records.length} thumbnails!`);
         });
      } else {
         console.log('No constraint violations found.');
      }

   } catch (error) {
      console.error('Error:', error);
   } finally {
      await prisma.$disconnect();
   }
}

checkMediaRecords();
