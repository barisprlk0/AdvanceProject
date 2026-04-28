import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../core/services/cart.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

interface CheckoutOrderPayload {
  storeId: number;
  paymentMethod: string;
  items: { productId: number; quantity: number }[];
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">Siparisi Tamamla</h1>
        <p class="page-subtitle">Odeme yontemi secin ve siparisinizi onaylayin</p>
      </div>

      <div class="checkout-grid">
        <div class="checkout-form-column">
          <div class="card">
            <h2 class="card-title">Odeme Yontemi</h2>
            <div class="payment-options">
              <label class="payment-option" [class.active]="paymentMethod() === 'Credit Card'">
                <input type="radio" name="payment" [(ngModel)]="paymentMethod" value="Credit Card">
                <div class="option-content">
                  <div class="option-icon">Card</div>
                  <div class="option-text">
                    <strong>Kredi Karti</strong>
                    <p>Stripe Checkout ile guvenli odeme alinacak</p>
                  </div>
                </div>
              </label>
              <label class="payment-option" [class.active]="paymentMethod() === 'Cash on Delivery'">
                <input type="radio" name="payment" [(ngModel)]="paymentMethod" value="Cash on Delivery">
                <div class="option-content">
                  <div class="option-icon">Cash</div>
                  <div class="option-text">
                    <strong>Kapida Odeme</strong>
                    <p>Urunu teslim alirken nakit veya kartla odeyin</p>
                  </div>
                </div>
              </label>
            </div>

            @if (paymentMethod() === 'Credit Card') {
              <div class="stripe-note">
                <div class="alert alert-info">
                  <strong>Stripe:</strong> Kart bilgileri uygulamada tutulmaz; odeme Stripe'in guvenli sayfasinda tamamlanir.
                </div>
              </div>
            }
          </div>
        </div>

        <div class="checkout-summary-column">
          <div class="card summary-card">
            <h2 class="card-title">Siparis Ozeti</h2>
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
                <span class="spinner spinner-sm"></span> Isleniyor...
              } @else if (paymentMethod() === 'Credit Card') {
                Stripe ile Ode
              } @else {
                Siparisi Onayla
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
    .option-icon { min-width: 42px; height: 42px; border-radius: var(--radius-md); background: var(--surface-alt); display: grid; place-items: center; font-size: 0.75rem; font-weight: 700; color: var(--primary); }
    .option-text strong { display: block; margin-bottom: 2px; }
    .option-text p { font-size: 0.8125rem; color: var(--text-muted); margin: 0; }

    .stripe-note { margin-top: 24px; }
    .alert { padding: 12px 16px; border-radius: var(--radius-md); font-size: 0.875rem; }
    .alert-info { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }

    .items-preview { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .item-line { display: flex; justify-content: space-between; gap: 16px; font-size: 0.875rem; color: var(--text-secondary); }
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
    private router: Router,
    private route: ActivatedRoute
  ) {
    const stripeSessionId = this.route.snapshot.queryParamMap.get('stripeSessionId');
    if (stripeSessionId) {
      this.completeStripePayment(stripeSessionId);
      return;
    }

    if (this.route.snapshot.queryParamMap.get('stripeCanceled')) {
      this.toast.error('Stripe odemesi iptal edildi.');
    }

    if (this.cart.items().length === 0) {
      this.router.navigate(['/app/cart']);
    }
  }

  confirmOrder() {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);

    const orders = this.buildOrderPayloads(
      this.paymentMethod() === 'Credit Card' ? 'Stripe' : this.paymentMethod()
    );

    if (this.paymentMethod() === 'Credit Card') {
      this.startStripeCheckout(orders);
      return;
    }

    this.createOrders(orders);
  }

  private buildOrderPayloads(paymentMethod: string): CheckoutOrderPayload[] {
    const itemsByStore = new Map<number, { productId: number; quantity: number }[]>();
    this.cart.items().forEach(item => {
      const storeId = item.product.store?.id || 1;
      if (!itemsByStore.has(storeId)) itemsByStore.set(storeId, []);
      itemsByStore.get(storeId)?.push({
        productId: item.product.id,
        quantity: item.quantity
      });
    });

    return Array.from(itemsByStore.entries()).map(([storeId, items]) => ({
      storeId,
      paymentMethod,
      items
    }));
  }

  private startStripeCheckout(orders: CheckoutOrderPayload[]) {
    this.api.postEndpoint<{ sessionId: string; checkoutUrl: string }>('payments/checkout-session', { orders })
      .subscribe({
        next: response => {
          localStorage.setItem('pendingStripeSessionId', response.sessionId);
          window.location.href = response.checkoutUrl;
        },
        error: err => {
          console.error(err);
          this.toast.error(this.errorMessage(err, 'Stripe odemesi baslatilamadi.'));
          this.loading.set(false);
        }
      });
  }

  private completeStripePayment(sessionId: string) {
    this.loading.set(true);
    const pendingSessionId = localStorage.getItem('pendingStripeSessionId');

    if (pendingSessionId !== sessionId) {
      this.toast.error('Tamamlanacak bekleyen Stripe odemesi bulunamadi.');
      this.loading.set(false);
      this.router.navigate(['/app/cart']);
      return;
    }

    this.api.postEndpoint('payments/complete', { sessionId })
      .subscribe({
        next: () => {
          localStorage.removeItem('pendingStripeSessionId');
          this.toast.success('Stripe odemesi alindi ve siparisiniz olusturuldu!');
          this.cart.clearCart();
          this.router.navigate(['/app/orders']);
        },
        error: err => {
          console.error(err);
          this.toast.error(this.errorMessage(err, 'Stripe odemesi dogrulanirken bir hata olustu.'));
          this.loading.set(false);
        }
      });
  }

  private createOrders(orders: CheckoutOrderPayload[]) {
    const orderPromises = orders.map(request => this.api.create('orders', request).toPromise());

    Promise.all(orderPromises)
      .then(() => {
        this.toast.success('Siparisiniz basariyla alindi!');
        this.cart.clearCart();
        this.router.navigate(['/app/orders']);
      })
      .catch((err) => {
        console.error(err);
        this.toast.error(this.errorMessage(err, 'Siparis olusturulurken bir hata olustu.'));
      })
      .finally(() => this.loading.set(false));
  }

  private errorMessage(err: any, fallback: string): string {
    return err?.error?.message || err?.message || fallback;
  }
}
