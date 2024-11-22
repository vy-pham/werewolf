import { inject, Pipe, PipeTransform } from '@angular/core';
import { RoleService } from '../services/role/role.service';

@Pipe({
  name: 'getRoleName',
  standalone: true,
})
export class GetRoleNamePipe implements PipeTransform {
  roleService = inject(RoleService);
  transform(roleId?: string): string {
    return this.roleService.roles.find((r) => r.id === roleId)?.name || '';
  }
}
