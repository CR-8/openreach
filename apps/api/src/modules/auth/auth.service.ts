import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto, LoginDto, RefreshDto } from './dto/auth.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const organization = await this.prisma.organization.create({
      data: {
        name: dto.organizationName,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: Role.ADMIN,
        memberships: {
          create: {
            organizationId: organization.id,
            role: Role.ADMIN,
          },
        },
      },
    });

    return this.generateTokens(user.id, user.email, user.name, user.role, organization.id);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        memberships: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const orgId = user.memberships[0]?.organizationId || '';
    return this.generateTokens(user.id, user.email, user.name, user.role, orgId);
  }

  async refresh(dto: RefreshDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'super-secret-openreach-refresh-token-key-change-in-prod',
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { memberships: true },
      });
      if (!user) throw new UnauthorizedException('User not found');

      const orgId = user.memberships[0]?.organizationId || payload.organizationId || '';
      return this.generateTokens(user.id, user.email, user.name, user.role, orgId);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
    name: string,
    role: Role,
    organizationId: string,
  ) {
    const payload = { sub: userId, email, name, role, organizationId };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET || 'super-secret-openreach-jwt-token-key-change-in-prod',
      expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'super-secret-openreach-refresh-token-key-change-in-prod',
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email,
        name,
        role,
        organizationId,
      },
    };
  }
}
