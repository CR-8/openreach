import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const orgHeader = request.headers['x-organization-id'];
    const organizationId = orgHeader || user?.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization context missing');
    }

    request.organizationId = organizationId;
    return true;
  }
}
