import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">Alışveriş Sepetim</h1>
        <p class="page-subtitle">Seçtiğiniz ürünleri gözden geçirin ve ödemeye geçin</p>
      </div>

      @if (cart.items().length === 0) {
        <div class="card empty-cart-card">
          <div class="empty-icon">🛒</div>
          <h2>Sepetiniz boş</h2>
          <p>Henüz sepetinize bir ürün eklemediniz. Ürünler sayfasından alışverişe başlayabilirsiniz.</p>
          <button class="btn btn-primary" routerLink="/app/products">Alışverişe Başla</button>
        </div>
      } @else {
        <div class="cart-grid">
          <div class="cart-items-column">
            <div class="card">
              <div class="cart-items-list">
                @for (item of cart.items(); track item.product.id) {
                  <div class="cart-item">
                    <div class="item-img" [style.background]="'hsl(' + (item.product.id || 0) * 47 % 360 + ', 40%, 95%)'">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                    </div>
                    <div class="item-info">
                      <h3>{{ item.product.name }}</h3>
                      <p class="item-store">{{ item.product.store?.name }}</p>
                      <p class="item-price">{{ item.product.unitPrice | currency:'TRY' }}</p>
                    </div>
                    <div class="item-actions">
                      <div class="qty-control">
                        <button (click)="cart.updateQuantity(item.product.id!, item.quantity - 1)" [disabled]="item.quantity <= 1">-</button>
                        <span>{{ item.quantity }}</span>
                        <button (click)="cart.updateQuantity(item.product.id!, item.quantity + 1)" [disabled]="item.quantity >= (item.product.stockQuantity || 0)">+</button>
                      </div>
                      <button class="btn-remove" (click)="cart.removeFromCart(item.product.id!)">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="cart-summary-column">
            <div class="card summary-card">
              <h2 class="card-title">Sipariş Özeti</h2>
              <div class="summary-row">
                <span>Ara Toplam</span>
                <span>{{ cart.totalPrice() | currency:'TRY' }}</span>
              </div>
              <div class="summary-row">
                <span>Kargo</span>
                <span class="free-shipping">Ücretsiz</span>
              </div>
              <hr>
              <div class="summary-row total-row">
                <span>Toplam</span>
                <span>{{ cart.totalPrice() | currency:'TRY' }}</span>
              </div>
              <button class="btn btn-primary btn-lg checkout-btn" routerLink="/app/checkout">
                Ödemeye Geç
              </button>
              <button class="btn btn-ghost clear-btn" (click)="cart.clearCart()">
                Sepeti Temizle
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .empty-cart-card { text-align: center; padding: 80px 40px; }
    .empty-icon { font-size: 4rem; margin-bottom: 24px; }
    .empty-cart-card h2 { margin-bottom: 12px; }
    .empty-cart-card p { color: var(--text-muted); margin-bottom: 32px; }
    
    .cart-grid { display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start; }
    .cart-items-list { display: flex; flex-direction: column; }
    .cart-item { display: flex; align-items: center; gap: 20px; padding: 20px; border-bottom: 1px solid var(--border-light); }
    .cart-item:last-child { border-bottom: none; }
    .item-img { width: 64px; height: 64px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--primary); }
    .item-info { flex: 1; }
    .item-info h3 { font-size: 1rem; margin-bottom: 4px; }
    .item-store { font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 4px; }
    .item-price { font-weight: 700; color: var(--primary); }
    
    .item-actions { display: flex; align-items: center; gap: 16px; }
    .qty-control { display: flex; align-items: center; border: 1px solid var(--border-color); border-radius: var(--radius-sm); height: 36px; overflow: hidden; }
    .qty-control button { width: 32px; height: 100%; border: none; background: var(--bg-surface); cursor: pointer; }
    .qty-control span { width: 40px; text-align: center; font-weight: 600; font-size: 0.9375rem; }
    .btn-remove { color: var(--text-muted); padding: 8px; border-radius: 6px; transition: all 0.2s; background: none; border: none; cursor: pointer; }
    .btn-remove:hover { color: #ef4444; background: #fee2e2; }
    
    .summary-card { padding: 24px; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 0.9375rem; }
    .total-row { font-weight: 700; font-size: 1.125rem; margin-top: 8px; color: var(--text-primary); }
    .free-shipping { color: #10b981; font-weight: 600; }
    .checkout-btn { width: 100%; margin-top: 12px; height: 50px; }
    .clear-btn { width: 100%; margin-top: 8px; color: #ef4444; }
    
    @media (max-width: 992px) { .cart-grid { grid-template-columns: 1fr; } }
  `
})
export class CartComponent {
  constructor(public cart: CartService) {}
}
