import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  roleType = signal('Individual');
  gender = signal('');
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit(): Promise<void> {
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Lütfen tüm alanları doldurun.');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Şifreler eşleşmiyor.');
      return;
    }

    if (this.password().length < 6) {
      this.errorMessage.set('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const success = await this.auth.register({
        email: this.email(),
        password: this.password(),
        roleType: this.roleType(),
        gender: this.gender() || undefined
      });

      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage.set('Kayıt oluşturulamadı.');
      }
    } catch {
      this.errorMessage.set('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
