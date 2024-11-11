import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { QUERY_ROLES } from './role.queries';
import { BehaviorSubject, tap } from 'rxjs';
import type { RolesQuery } from '../../../../graphql/queries';
import type { ExtractDataType } from '../../entities/utils.entities';
type Roles = ExtractDataType<RolesQuery['roles']>;
@Injectable({ providedIn: 'root' })
export class RoleService {
  apollo = inject(Apollo);
  get roles() {
    return this.roles$.value;
  }
  set roles(v: Roles) {
    this.roles$.next(v);
  }
  roles$ = new BehaviorSubject<Roles>([]);
  getRoles$ = this.apollo.query<RolesQuery>({ query: QUERY_ROLES }).pipe(
    tap(({ data }) => {
      if (data.roles.__typename === 'RoleModel_List') {
        this.roles = data.roles.data;
      }
    })
  );
}
