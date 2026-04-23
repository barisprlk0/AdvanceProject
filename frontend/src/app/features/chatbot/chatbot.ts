import { Component, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

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
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  inputText = signal('');
  showSql = signal<string | null>(null);
  private shouldScroll = false;

  messages = signal<ChatMsg[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Merhaba! 👋 Ben ShopLens AI Asistanı. E-ticaret verileriniz hakkında doğal dilde sorular sorabilirsiniz. Örneğin:\n\n• "Bu ayki toplam satış ne kadar?"\n• "En çok satılan 5 ürün hangileri?"\n• "Geçen aya göre sipariş artışı ne oldu?"',
      timestamp: new Date()
    }
  ]);

  suggestions = signal([
    'Bu ayki toplam gelir ne kadar?',
    'En çok satan 5 ürünü göster',
    'Müşteri memnuniyet ortalaması kaç?',
    'Hangi kategoride en çok iade var?'
  ]);

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

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));

    const response = this.getMockResponse(msg);

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

  private getMockResponse(question: string): ChatMsg {
    const q = question.toLowerCase();
    if (q.includes('gelir') || q.includes('satış') || q.includes('ciro')) {
      return {
        id: '', role: 'assistant', timestamp: new Date(),
        content: 'Bu ayki toplam gelir **₺284,520** olarak gerçekleşti. Geçen aya göre **%12.5** artış gösterdi.\n\nEn yüksek gelir Elektronik kategorisinden (₺96,834) gelirken, onu Giyim (₺71,130) ve Aksesuar (₺51,214) takip ediyor.',
        sql: 'SELECT SUM(oi.unit_price * oi.quantity) AS total_revenue\nFROM order_items oi\nJOIN orders o ON o.id = oi.order_id\nWHERE o.order_date >= DATE_TRUNC(\'month\', CURRENT_DATE);'
      };
    }
    if (q.includes('ürün') || q.includes('satan')) {
      return {
        id: '', role: 'assistant', timestamp: new Date(),
        content: 'En çok satan 5 ürün şu şekilde:\n\n| # | Ürün | Satış | Gelir |\n|---|------|-------|-------|\n| 1 | Organik Yeşil Çay | 423 | ₺12,690 |\n| 2 | Kablosuz Kulaklık Pro | 342 | ₺68,400 |\n| 3 | Akıllı Saat Ultra | 281 | ₺84,300 |\n| 4 | Spor Ayakkabı X | 198 | ₺29,700 |\n| 5 | Deri Çanta Classic | 156 | ₺46,800 |',
        sql: 'SELECT p.description, SUM(oi.quantity) AS total_sold,\n       SUM(oi.unit_price * oi.quantity) AS revenue\nFROM order_items oi\nJOIN products p ON p.id = oi.product_id\nGROUP BY p.id, p.description\nORDER BY total_sold DESC\nLIMIT 5;'
      };
    }
    if (q.includes('müşteri') || q.includes('memnuniyet')) {
      return {
        id: '', role: 'assistant', timestamp: new Date(),
        content: 'Müşteri memnuniyet ortalaması **4.6 / 5.0** olarak hesaplanmıştır.\n\nDağılım:\n- ⭐⭐⭐⭐⭐ 5 yıldız: %42\n- ⭐⭐⭐⭐ 4 yıldız: %31\n- ⭐⭐⭐ 3 yıldız: %18\n- ⭐⭐ 2 yıldız: %6\n- ⭐ 1 yıldız: %3\n\nGeçen aya göre 0.2 puan artış var.',
        sql: 'SELECT AVG(star_rating) AS avg_rating,\n       COUNT(*) AS total_reviews\nFROM reviews\nWHERE created_at >= DATE_TRUNC(\'month\', CURRENT_DATE);'
      };
    }
    if (q.includes('iade') || q.includes('iptal')) {
      return {
        id: '', role: 'assistant', timestamp: new Date(),
        content: 'İade oranı en yüksek kategoriler:\n\n1. **Giyim** — %8.2 (beden uyumsuzluğu)\n2. **Elektronik** — %4.1 (arıza/beklenti)\n3. **Gıda** — %2.8 (hasar)\n\nGenel iade oranı **%4.7** ile sektör ortalamasının altında.',
        sql: 'SELECT c.name AS category,\n       COUNT(CASE WHEN o.status = \'RETURNED\' THEN 1 END) * 100.0 / COUNT(*) AS return_rate\nFROM orders o\nJOIN order_items oi ON o.id = oi.order_id\nJOIN products p ON p.id = oi.product_id\nJOIN categories c ON c.id = p.category_id\nGROUP BY c.name\nORDER BY return_rate DESC;'
      };
    }
    return {
      id: '', role: 'assistant', timestamp: new Date(),
      content: 'İlginç bir soru! Şu an veritabanınızda bu konuyla ilgili analiz yapıyorum.\n\nSonuçlara göre, platformda toplam **12,493 aktif müşteri** ve **3,281 ürün** bulunuyor. Daha spesifik bir soru sorarsanız daha detaylı analiz sunabilirim.',
      sql: 'SELECT\n  (SELECT COUNT(*) FROM users WHERE role = \'INDIVIDUAL\') AS total_customers,\n  (SELECT COUNT(*) FROM products) AS total_products;'
    };
  }
}
