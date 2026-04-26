import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  email = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit(): Promise<void> {
    const email = this.email().trim().toLowerCase();
    const password = this.password().trim();

    if (!email || !password) {
      this.errorMessage.set('Lütfen tüm alanları doldurun.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const success = await this.auth.login({
        email,
        password
      });

      if (success) {
        this.router.navigate(['/app/dashboard']);
      } else {
        this.errorMessage.set('E-posta veya şifre hatalı.');
      }
    } catch (error: any) {
      this.errorMessage.set(error?.error?.error || error?.error?.message || 'E-posta veya şifre hatalı.');
    } finally {
      this.isLoading.set(false);
    }
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }
}
