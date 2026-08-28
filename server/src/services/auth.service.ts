import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import type { User } from '@prisma/client'

const JWT_SECRET  = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required')
const JWT_EXPIRES = process.env.JWT_EXPIRES ?? '7d'

export interface JwtPayload {
  userId:      string
  email:       string
  workspaceId: string   // workspace activo por defecto (el primero al que pertenece)
}

export const authService = {
  async login(email: string, password: string): Promise<{ token: string; user: Omit<User, 'passwordHash'> }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        workspaceMembers: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          include: { workspace: { select: { id: true, name: true, slug: true, type: true } } },
        },
      },
    })

    if (!user) throw Object.assign(new Error('Credenciales incorrectas'), { status: 401 })
    if (user.status !== 'ACTIVE') throw Object.assign(new Error('Cuenta inactiva o suspendida'), { status: 403 })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw Object.assign(new Error('Credenciales incorrectas'), { status: 401 })

    const defaultWorkspaceId = user.workspaceMembers[0]?.workspaceId ?? ''

    const payload: JwtPayload = {
      userId:      user.id,
      email:       user.email,
      workspaceId: defaultWorkspaceId,
    }

    const token = jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES } as jwt.SignOptions)

    await prisma.auditLog.create({
      data: {
        userId:     user.id,
        workspaceId: defaultWorkspaceId || null,
        action:     'LOGIN',
        entityType: 'User',
        entityId:   user.id,
      },
    }).catch(() => null) // non-blocking audit

    const { passwordHash: _, ...safeUser } = user
    return { token, user: safeUser as Omit<User, 'passwordHash'> }
  },

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  },

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        avatarUrl: true, status: true, createdAt: true, updatedAt: true,
        workspaceMembers: {
          include: {
            workspace: { select: { id: true, name: true, slug: true, type: true, emoji: true } },
          },
        },
      },
    })
    return user
  },

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET!) as JwtPayload
  },

  async getUserWorkspaces(userId: string) {
    return prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    })
  },

  async verifyWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    })
    return !!member
  },
}
