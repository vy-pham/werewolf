import { Component, inject } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { HomeService } from './home.service';
import { ModalComponent } from '../shared/components/modal/modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ButtonComponent, ModalComponent],
  providers: [HomeService],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  homeService = inject(HomeService);


  ngOnInit() {
    this.homeService.getUser();
  }
  openModal() {
    this.homeService.isShow = true;
  }
  onClose() {
    this.homeService.isShow = false;
    console.log('Closed');

  }
}
