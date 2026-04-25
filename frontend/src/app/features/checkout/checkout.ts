import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../core/services/cart.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [RouterLink, FormsModule, CurrencyPipe],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">Siparişi Tamamla</h1>
        <p class="page-subtitle">Ödeme yöntemi seçin ve siparişinizi onaylayın</p>
      </div>

      <div class="checkout-grid">
        <div class="checkout-form-column">
          <div class="card">
            <h2 class="card-title">Ödeme Yöntemi</h2>
            <div class="payment-options">
              <label class="payment-option" [class.active]="paymentMethod() === 'Credit Card'">
                <input type="radio" name="payment" [(ngModel)]="paymentMethod" value="Credit Card">
                <div class="option-content">
                  <div class="option-icon">💳</div>
                  <div class="option-text">
                    <strong>Kredi Kartı</strong>
                    <p>Güvenli ödeme altyapısı ile ödeyin</p>
                  </div>
                </div>
              </label>
              <label class="payment-option" [class.active]="paymentMethod() === 'Cash on Delivery'">
                <input type="radio" name="payment" [(ngModel)]="paymentMethod" value="Cash on Delivery">
                <div class="option-content">
                  <div class="option-icon">💵</div>
                  <div class="option-text">
                    <strong>Kapıda Ödeme</strong>
                    <p>Ürünü teslim alırken nakit veya kartla ödeyin</p>
                  </div>
                </div>
              </label>
            </div>

            @if (paymentMethod() === 'Credit Card') {
              <div class="stripe-note">
                <div class="alert alert-info">
                  <strong>Bilgi:</strong> Bir sonraki aşamada Stripe entegrasyonu eklenecektir. Şu an simülasyon olarak onaylanmaktadır.
                </div>
              </div>
            }
          </div>
        </div>

        <div class="checkout-summary-column">
          <div class="card summary-card">
            <h2 class="card-title">Sipariş Özeti</h2>
            <div class="items-preview">
              @for (item of cart.items(); track item.product.id) {
                <div class="item-line">
                  <span>{{ item.quantity }}x {{ item.product.name }}</span>
                  <span>{{ (Number(item.product.unitPrice) * item.quantity) | currency:'TRY' }}</span>
                </div>
              }
            </div>
            <hr>
            <div class="summary-row total-row">
              <span>Genel Toplam</span>
              <span>{{ cart.totalPrice() | currency:'TRY' }}</span>
            </div>
            <button class="btn btn-primary btn-lg checkout-btn" (click)="confirmOrder()" [disabled]="loading()">
              @if (loading()) {
                <span class="spinner spinner-sm"></span> Onaylanıyor...
              } @else {
                Siparişi Onayla
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .checkout-grid { display: grid; grid-template-columns: 1fr 360px; gap: 24px; align-items: start; }
    .payment-options { display: flex; flex-direction: column; gap: 12px; margin: 20px 0; }
    .payment-option { border: 2px solid var(--border-color); border-radius: var(--radius-lg); padding: 20px; cursor: pointer; transition: all 0.2s; display: block; position: relative; }
    .payment-option input { position: absolute; opacity: 0; }
    .payment-option.active { border-color: var(--primary); background: var(--primary-light); }
    .option-content { display: flex; gap: 16px; align-items: center; }
    .option-icon { font-size: 1.5rem; }
    .option-text strong { display: block; margin-bottom: 2px; }
    .option-text p { font-size: 0.8125rem; color: var(--text-muted); margin: 0; }
    
    .stripe-note { margin-top: 24px; }
    .alert { padding: 12px 16px; border-radius: var(--radius-md); font-size: 0.875rem; }
    .alert-info { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }

    .items-preview { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .item-line { display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--text-secondary); }
    .summary-card { padding: 24px; }
    .total-row { font-weight: 700; font-size: 1.125rem; margin-top: 8px; color: var(--text-primary); }
    .checkout-btn { width: 100%; margin-top: 20px; height: 54px; }
    
    @media (max-width: 992px) { .checkout-grid { grid-template-columns: 1fr; } }
  `
})
export class CheckoutComponent {
  paymentMethod = signal('Credit Card');
  loading = signal(false);
  Number = Number;

  constructor(
    public cart: CartService,
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {
    if (this.cart.items().length === 0) {
      this.router.navigate(['/app/cart']);
    }
  }

  confirmOrder() {
    this.loading.set(true);
    
    // Group items by store (backend Order needs storeId)
    // For simplicity, we create one order per store in the cart
    const itemsByStore = new Map<number, any[]>();
    this.cart.items().forEach(item => {
      const storeId = item.product.store?.id || 1;
      if (!itemsByStore.has(storeId)) itemsByStore.set(storeId, []);
      itemsByStore.get(storeId)?.push({
        productId: item.product.id,
        quantity: item.quantity
      });
    });

    const orderPromises = Array.from(itemsByStore.entries()).map(([storeId, items]) => {
      const request = {
        storeId,
        paymentMethod: this.paymentMethod(),
        items
      };
      return this.api.create('orders', request).toPromise();
    });

    Promise.all(orderPromises)
      .then(() => {
        this.toast.success('Siparişiniz başarıyla alındı!');
        this.cart.clearCart();
        this.router.navigate(['/app/orders']);
      })
      .catch((err) => {
        console.error(err);
        this.toast.error('Sipariş oluşturulurken bir hata oluştu.');
      })
      .finally(() => this.loading.set(false));
  }
}
