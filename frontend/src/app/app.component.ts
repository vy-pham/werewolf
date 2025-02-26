import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { StorageService } from './shared/services/storage.service';
import { UserService } from './shared/services/user/user.service';
import { RoleService } from './shared/services/role/role.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  providers: [],
  templateUrl: './app.component.html',
  standalone: true,
})
export class AppComponent {
  storageService = inject(StorageService);
  userService = inject(UserService);
  roleService = inject(RoleService);
  ngOnInit() {
    this.roleService.getRoles$.subscribe();
  }
}
