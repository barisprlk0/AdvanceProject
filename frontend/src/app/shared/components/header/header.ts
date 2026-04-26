import { Component, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent {
  searchQuery = signal('');
  showNotifications = signal(false);

  constructor(public auth: AuthService) {}

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
  }
}
