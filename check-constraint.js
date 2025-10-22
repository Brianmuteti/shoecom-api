const { PrismaClient } = require('./generated/prisma/client');

const prisma = new PrismaClient();

async function checkConstraint() {
   try {
      // Check the actual constraint in the database
      const result = await prisma.$queryRaw`
            SELECT 
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                tc.constraint_type
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'ProductMedia'
            AND tc.constraint_type = 'UNIQUE'
            ORDER BY tc.constraint_name, kcu.ordinal_position;
        `;

      console.log('Unique constraints on ProductMedia table:');
      console.log(result);

      // Also check if there are any records that would violate the constraint
      const records = await prisma.$queryRaw`
            SELECT "productId", "isThumbnail", COUNT(*) as count
            FROM "ProductMedia"
            GROUP BY "productId", "isThumbnail"
            HAVING COUNT(*) > 1
        `;

      console.log('Records that violate unique constraint:');
      console.log(records);

   } catch (error) {
      console.error('Error:', error);
   } finally {
      await prisma.$disconnect();
   }
}

checkConstraint();
