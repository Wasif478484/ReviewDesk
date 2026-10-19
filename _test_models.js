const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
console.log('db.user:', typeof db.user);
console.log('db.business:', typeof db.business);
console.log('db.review:', typeof db.review);
console.log('db.triage:', typeof db.triage);
console.log('db.template:', typeof db.template);
console.log('db.organization:', typeof db.organization);
db.$disconnect();
