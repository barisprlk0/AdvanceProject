import { Component, signal, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { Product, PageResponse } from '../../../core/models';
import { ProductFormComponent } from '../product-form/product-form';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, ProductFormComponent, SkeletonComponent, EmptyStateComponent, PaginationComponent],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css'
})
export class ProductListComponent implements OnInit {
  viewMode = signal<'grid' | 'table'>('grid');
  
  // State for Pagination & Search
  products = signal<Product[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  currentPage = signal(0);
  pageSize = signal(12);
  totalElements = signal(0);
  totalPages = signal(0);

  // Form Modal State
  showForm = signal(false);
  editingProduct = signal<Product | null>(null);

  categories = signal([
    { value: 'all', label: 'Tüm Kategoriler' },
  ]);
  selectedCategory = signal('all');

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.fetchProducts();
    this.fetchCategories();
  }

  fetchProducts(): void {
    this.loading.set(true);
    
    const params: any = {
      page: this.currentPage(),
      size: this.pageSize(),
      sort: 'id,desc'
    };

    if (this.searchQuery()) params.search = this.searchQuery();
    if (this.selectedCategory() !== 'all') params.category = this.selectedCategory();

    this.api.getPage<Product>('products', this.currentPage(), this.pageSize(), params).subscribe({
      next: (res: PageResponse<Product>) => {
        this.products.set(res.content);
        this.totalElements.set(res.totalElements);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Ürünler yüklenirken hata oluştu.');
      }
    });
  }

  fetchCategories(): void {
    this.api.getAll<any>('categories').subscribe(data => {
      this.categories.set([
        { value: 'all', label: 'Tüm Kategoriler' },
        ...data.map((c: any) => ({ value: c.name, label: c.name }))
      ]);
    });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(0); // Reset to first page
    this.fetchProducts();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.fetchProducts();
  }

  openAddForm(): void {
    this.editingProduct.set(null);
    this.showForm.set(true);
  }

  openEditForm(product: Product, event: Event): void {
    event.stopPropagation();
    this.editingProduct.set(product);
    this.showForm.set(true);
  }

  onFormSave(): void {
    this.showForm.set(false);
    this.fetchProducts();
  }

  deleteProduct(id: number, event: Event): void {
    event.stopPropagation();
    if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      this.api.delete('products', id).subscribe({
        next: () => {
          this.toast.success('Ürün başarıyla silindi.');
          this.fetchProducts();
        },
        error: () => this.toast.error('Silme işlemi başarısız.')
      });
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  getDisplayName(p: Product): string {
    return p.name || p.description || `Ürün #${p.id}`;
  }
}
