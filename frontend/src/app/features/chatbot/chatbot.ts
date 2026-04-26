import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { DatePipe, DecimalPipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ChatAskResponse, ChatChartData } from '../../core/models';
import { firstValueFrom } from 'rxjs';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sql?: string;
  rows?: Record<string, unknown>[];
  chart?: ChatChartData;
  roleScope?: string;
  isLoading?: boolean;
}

@Component({
  selector: 'app-chatbot',
  imports: [FormsModule, DatePipe, DecimalPipe, JsonPipe],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css'
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  inputText = signal('');
  showSql = signal<string | null>(null);
  private shouldScroll = false;
  private sessionId = crypto.randomUUID();

  messages = signal<ChatMsg[]>([
    {
      id: 'seed',
      role: 'assistant',
      content: 'Hello. I am your Multi-Agent Text2SQL assistant. Ask about revenue, orders, reviews, shipments, or trends.',
      timestamp: new Date()
    }
  ]);

  suggestions = signal([
    'Show me sales by category for last month',
    'What are my top 5 customers by revenue?',
    'What is the trend in order cancellations?',
    'How many orders were shipped by air?'
  ]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {}

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  async sendMessage(text?: string): Promise<void> {
    const msg = (text ?? this.inputText()).trim();
    if (!msg) return;

    this.messages.update((items) => [
      ...items,
      { id: crypto.randomUUID(), role: 'user', content: this.escapeHtml(msg), timestamp: new Date() }
    ]);
    this.inputText.set('');
    this.shouldScroll = true;

    const loadingId = crypto.randomUUID();
    this.messages.update((items) => [
      ...items,
      { id: loadingId, role: 'assistant', content: '', timestamp: new Date(), isLoading: true }
    ]);

    try {
      const response = await firstValueFrom(
        this.api.postEndpoint<ChatAskResponse>('chat/ask', {
          question: msg,
          sessionId: this.sessionId
        })
      );
      const assistantMsg = this.toAssistantMessage(response, loadingId);
      this.messages.update((items) => items.map((m) => (m.id === loadingId ? assistantMsg : m)));
    } catch (error) {
      this.messages.update((items) =>
        items.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                isLoading: false,
                content: 'AI service is not reachable right now. Please try again.'
              }
            : m
        )
      );
      console.error('Chat request failed', error);
    } finally {
      this.shouldScroll = true;
    }
  }

  toggleSql(sql: string): void {
    this.showSql.update((current) => (current === sql ? null : sql));
  }

  trackByRowIndex(index: number): number {
    return index;
  }

  getBarWidth(value: number, values: number[]): string {
    const max = Math.max(...values, 0);
    if (max <= 0) return '0%';
    return `${(value / max) * 100}%`;
  }

  private toAssistantMessage(response: ChatAskResponse, id: string): ChatMsg {
    const answer = response.finalAnswer || 'No response generated.';
    return {
      id,
      role: 'assistant',
      timestamp: new Date(),
      isLoading: false,
      content: this.toHtml(answer),
      sql: response.sqlQuery,
      rows: response.rows?.slice(0, 8) ?? [],
      chart: response.chart,
      roleScope: response.roleScope
    };
  }

  private toHtml(text: string): string {
    return this.escapeHtml(text).replace(/\n/g, '<br>');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private scrollToBottom(): void {
    if (!this.messagesContainer) return;
    const el = this.messagesContainer.nativeElement;
    el.scrollTop = el.scrollHeight;
  }
}
