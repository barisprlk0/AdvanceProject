import { Injectable, signal, computed } from '@angular/core';
import { Product } from '../models';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private _items = signal<CartItem[]>(this.loadCart());

  items = computed(() => this._items());
  totalCount = computed(() => this._items().reduce((acc, item) => acc + item.quantity, 0));
  totalPrice = computed(() => this._items().reduce((acc, item) => acc + (Number(item.product.unitPrice) * item.quantity), 0));

  addToCart(product: Product, quantity: number = 1) {
    this._items.update(items => {
      const existing = items.find(i => i.product.id === product.id);
      const stock = product.stockQuantity ?? 999;
      if (existing) {
        const newQty = Math.min(stock, existing.quantity + quantity);
        return items.map(i => i.product.id === product.id ? { ...i, quantity: newQty } : i);
      }
      return [...items, { product, quantity: Math.min(stock, quantity) }];
    });
    this.saveCart();
  }

  updateQuantity(productId: number, quantity: number) {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    this._items.update(items => items.map(i => {
      if (i.product.id === productId) {
        const stock = i.product.stockQuantity ?? 999;
        return { ...i, quantity: Math.min(stock, quantity) };
      }
      return i;
    }));
    this.saveCart();
  }

  removeFromCart(productId: number) {
    this._items.update(items => items.filter(i => i.product.id !== productId));
    this.saveCart();
  }

  clearCart() {
    this._items.set([]);
    this.saveCart();
  }

  private saveCart() {
    localStorage.setItem('cart', JSON.stringify(this._items()));
  }

  private loadCart(): CartItem[] {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  }
}
