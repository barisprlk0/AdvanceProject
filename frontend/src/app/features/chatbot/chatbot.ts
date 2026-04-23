import { Component, signal, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { Order, Product, Review } from '../../core/models';
import { firstValueFrom } from 'rxjs';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sql?: string;
  isLoading?: boolean;
}

@Component({
  selector: 'app-chatbot',
  imports: [FormsModule, DatePipe],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css'
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  inputText = signal('');
  showSql = signal<string | null>(null);
  private shouldScroll = false;

  private products: Product[] = [];
  private orders: Order[] = [];
  private reviews: Review[] = [];

  messages = signal<ChatMsg[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Merhaba! 👋 Ben ShopLens AI Asistanı. E-ticaret verileriniz hakkında doğal dilde sorular sorabilirsiniz. Örneğin:\n\n• "Bu ayki toplam satış ne kadar?"\n• "En çok satılan 5 ürün hangileri?"\n• "Ortalama ürün fiyatı nedir?"',
      timestamp: new Date()
    }
  ]);

  suggestions = signal([
    'Toplam gelir ne kadar?',
    'En pahalı ürünü göster',
    'Müşteri memnuniyet ortalaması kaç?',
    'Toplam kaç ürün var?'
  ]);

  constructor(private api: ApiService) {}

  async ngOnInit(): Promise<void> {
    try {
      // Load essential data for "local AI" simulation
      const [p, o, r] = await Promise.all([
        firstValueFrom(this.api.getAll<Product>('products')),
        firstValueFrom(this.api.getAll<Order>('orders')),
        firstValueFrom(this.api.getAll<Review>('reviews'))
      ]);
      this.products = p;
      this.orders = o;
      this.reviews = r;
    } catch (e) {
      console.error('Chatbot data loading failed', e);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  async sendMessage(text?: string): Promise<void> {
    const msg = text || this.inputText().trim();
    if (!msg) return;

    const userMsg: ChatMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date()
    };

    this.messages.update(msgs => [...msgs, userMsg]);
    this.inputText.set('');
    this.shouldScroll = true;

    // Loading indicator
    const loadingId = (Date.now() + 1).toString();
    this.messages.update(msgs => [...msgs, {
      id: loadingId, role: 'assistant', content: '', timestamp: new Date(), isLoading: true
    }]);

    // Simulate thinking
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));

    const response = this.generateResponse(msg);

    this.messages.update(msgs =>
      msgs.map(m => m.id === loadingId ? { ...response, id: loadingId } : m)
    );
    this.shouldScroll = true;
  }

  toggleSql(sql: string): void {
    this.showSql.update(v => v === sql ? null : sql);
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  private generateResponse(question: string): ChatMsg {
    const q = question.toLowerCase();
    const timestamp = new Date();

    if (q.includes('gelir') || q.includes('satış') || q.includes('ciro')) {
      const total = this.orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      return {
        id: '', role: 'assistant', timestamp,
        content: `Sistemdeki toplam gelir **₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}** olarak hesaplandı. Bu rakam toplam **${this.orders.length}** sipariş üzerinden elde edildi.`,
        sql: 'SELECT SUM(grand_total) FROM orders;'
      };
    }

    if (q.includes('ürün') && (q.includes('en') || q.includes('top'))) {
      const sorted = [...this.products].sort((a, b) => (b.unitPrice || 0) - (a.unitPrice || 0)).slice(0, 5);
      let content = 'En yüksek fiyatlı 5 ürün şunlar:\n\n';
      sorted.forEach((p, i) => {
        content += `${i + 1}. **${p.name || p.description}** — ₺${(p.unitPrice || 0).toLocaleString('tr-TR')}\n`;
      });
      return {
        id: '', role: 'assistant', timestamp,
        content,
        sql: 'SELECT name, unit_price FROM products ORDER BY unit_price DESC LIMIT 5;'
      };
    }

    if (q.includes('kaç') && q.includes('ürün')) {
      return {
        id: '', role: 'assistant', timestamp,
        content: `Şu anda veritabanımızda toplam **${this.products.length}** adet ürün tanımlı.`,
        sql: 'SELECT COUNT(*) FROM products;'
      };
    }

    if (q.includes('memnuniyet') || q.includes('puan') || q.includes('yıldız')) {
      const avg = this.reviews.length > 0 ? this.reviews.reduce((s, r) => s + (r.starRating || 0), 0) / this.reviews.length : 0;
      return {
        id: '', role: 'assistant', timestamp,
        content: `Müşteri memnuniyet ortalaması **${avg.toFixed(1)} / 5.0** düzeyinde. Toplam **${this.reviews.length}** yorum analiz edildi.`,
        sql: 'SELECT AVG(star_rating) FROM reviews;'
      };
    }

    return {
      id: '', role: 'assistant', timestamp,
      content: `İlginç bir soru! Şu an sistemde **${this.products.length}** ürün, **${this.orders.length}** sipariş ve **${this.reviews.length}** yorum bulunuyor. Bu veriler ışığında daha spesifik (gelir, fiyatlar, memnuniyet vb.) bir soru sorarsanız detaylı yanıt verebilirim.`,
      sql: 'SELECT COUNT(*) FROM products; SELECT COUNT(*) FROM orders;'
    };
  }
}
