import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { StorageService } from './shared/services/storage.service';
import { UserService } from './shared/services/user/user.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  providers: [],
  templateUrl: './app.component.html',
})
export class AppComponent {
  storageService = inject(StorageService);
  userService = inject(UserService);
  // ngOnInit() {
  //   const jwt = this.storageService.data[STORAGE_KEY.TOKEN];
  //   if (jwt) {
  //     this.userService.meQuery$.subscribe();
  //   }
  // }
}
