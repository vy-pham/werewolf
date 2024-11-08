import { Component, inject } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { HomeService } from './home.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ButtonComponent, CommonModule],
  providers: [HomeService],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  homeService = inject(HomeService);
}
