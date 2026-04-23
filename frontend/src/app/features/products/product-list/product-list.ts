import { Component, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Product } from '../../../core/models';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css'
})
export class ProductListComponent implements OnInit {
  viewMode = signal<'grid' | 'table'>('grid');
  searchQuery = signal('');
  selectedCategory = signal('all');
  products = signal<Product[]>([]);
  loading = signal(true);

  categories = signal([
    { value: 'all', label: 'Tüm Kategoriler' },
  ]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getAll<Product>('products').subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading.set(false);

        // Build category filter from real data
        const catNames = new Set<string>();
        data.forEach(p => { if (p.category?.name) catNames.add(p.category.name); });
        this.categories.set([
          { value: 'all', label: 'Tüm Kategoriler' },
          ...Array.from(catNames).map(n => ({ value: n, label: n }))
        ]);
      },
      error: () => this.loading.set(false)
    });
  }

  getStockStatus(_stock: number): { text: string; class: string } {
    return { text: 'Stokta', class: 'success' };
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  getDisplayName(p: Product): string {
    return p.name || p.description || `Ürün #${p.id}`;
  }
}
