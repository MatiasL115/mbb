// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seeding...');

  // Crear roles básicos
  const roles = [
    {
      name: 'ADMIN',
      permissions: ['*']
    },
    {
      name: 'TECHNICAL_APPROVER',
      permissions: ['read:all', 'approve:technical']
    },
    {
      name: 'FINANCIAL_APPROVER',
      permissions: ['read:all', 'approve:financial']
    },
    {
      name: 'USER',
      permissions: ['read:own', 'write:own']
    }
  ];

  console.log('Creando roles...');
  
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        permissions: role.permissions
      },
      create: {
        name: role.name,
        permissions: role.permissions
      }
    });
  }

  console.log('Roles creados exitosamente');

  // Crear usuario administrador por defecto
  console.log('Creando usuario administrador...');
  
  const adminRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' }
  });

  if (adminRole) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await prisma.user.upsert({
      where: { email: 'admin@mbigua.com' },
      update: {},
      create: {
        email: 'admin@mbigua.com',
        name: 'Administrador',
        passwordHash: hashedPassword,
        roleId: adminRole.id
      }
    });
  }

  console.log('Usuario administrador creado exitosamente');
}

main()
  .catch((e) => {
    console.error('Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });