const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.$connect().then(() => {
  console.log('Connected!');
  return db.$queryRaw`SELECT 1 as test`;
}).then(result => {
  console.log('Query result:', JSON.stringify(result));
  return db.$disconnect();
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
