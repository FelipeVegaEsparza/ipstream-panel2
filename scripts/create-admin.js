const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    // Datos del administrador
    const adminData = {
      email: 'admin@ipstream.com',
      password: 'admin123456', // Cambia esta contraseña
      name: 'Administrador Principal'
    }

    // Verificar si ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: adminData.email }
    })

    if (existingUser) {
      console.log('❌ Ya existe un usuario con ese email')
      return
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(adminData.password, 12)

    // Crear el usuario administrador
    const admin = await prisma.user.create({
      data: {
        email: adminData.email,
        password: hashedPassword,
        name: adminData.name,
        role: 'ADMIN'
      }
    })

    console.log('✅ Usuario administrador creado exitosamente:')
    console.log(`📧 Email: ${admin.email}`)
    console.log(`👤 Nombre: ${admin.name}`)
    console.log(`🔑 Contraseña: ${adminData.password}`)
    console.log(`🎯 Rol: ${admin.role}`)
    console.log('\n🚀 Ya puedes iniciar sesión en /auth/signin')

  } catch (error) {
    console.error('❌ Error al crear administrador:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()