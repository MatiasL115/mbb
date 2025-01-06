import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seeding...');

  // Crear roles básicos
  const roles = [
    { name: 'ADMIN', permissions: ['*'] },
    { name: 'TECHNICAL_APPROVER', permissions: ['read:all', 'approve:technical'] },
    { name: 'FINANCIAL_APPROVER', permissions: ['read:all', 'approve:financial'] },
    { name: 'USER', permissions: ['read:own', 'write:own'] },
  ];

  console.log('Creando roles...');
  for (const role of roles) {
    try {
      await prisma.role.upsert({
        where: { name: role.name },
        update: { permissions: role.permissions },
        create: { name: role.name, permissions: role.permissions },
      });
      console.log(`Rol "${role.name}" creado o actualizado.`);
    } catch (error) {
      console.error(`Error al crear o actualizar el rol "${role.name}":`, error);
    }
  }
  console.log('Roles creados exitosamente.');

  // Crear usuario administrador por defecto
  console.log('Creando usuario administrador...');
  const adminRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
  });

  if (!adminRole) {
    console.error('Error: No se encontró el rol ADMIN. Verificá las migraciones o los datos iniciales.');
    process.exit(1);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: 'admin@mbigua.com' } });
  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@mbigua.com',
        name: 'Administrador',
        passwordHash: hashedPassword,
        roleId: adminRole.id,
      },
    });
    console.log('Usuario administrador creado exitosamente.');
  } else {
    console.log('El usuario administrador ya existe. No se realizaron cambios.');
  }

  console.log('Resumen del seeding:');
  const rolesCount = await prisma.role.count();
  const usersCount = await prisma.user.count();
  console.log(`Roles creados o actualizados: ${rolesCount}`);
  console.log(`Usuarios creados o actualizados: ${usersCount}`);
}

main()
  .catch((e) => {
    console.error('Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
