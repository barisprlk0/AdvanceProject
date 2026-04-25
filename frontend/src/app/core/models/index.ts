// ============================================
// Domain Models — Backend Entity Aligned
// ============================================

// --- User ---
export interface User {
  id: number;
  email: string;
  roleType: string;  // "Individual", "Corporate", "Admin"
  gender?: string;
}

export type UserRole = 'ADMIN' | 'CORPORATE' | 'INDIVIDUAL';

export function mapRoleType(roleType: string): UserRole {
  const r = roleType?.toLowerCase();
  if (r === 'admin') return 'ADMIN';
  if (r === 'corporate') return 'CORPORATE';
  return 'INDIVIDUAL';
}

export function getUserDisplayName(user: User | null): string {
  if (!user) return 'Kullanıcı';
  return user.email.split('@')[0];
}

// --- Auth ---
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  email: string;
  id: number;
  roleType: string;
  gender?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  roleType?: string;
  gender?: string;
}

// --- Category ---
export interface Category {
  id: number;
  name: string;
  parent?: Category | null;
}

// --- Store ---
export interface Store {
  id: number;
  name: string;
  owner: User;
  status: string;
}

// --- Product ---
export interface Product {
  id: number;
  store?: Store;
  category?: Category;
  sku: string;
  name: string;
  description: string;
  unitPrice: number;
  stockQuantity?: number;
  currencyCode?: string;
  exchangeRate?: number;
}

// --- Order ---
export interface Order {
  id: number;
  user?: User;
  store?: Store;
  status: string;
  orderDate: string;
  paymentMethod: string;
  grandTotal: number;
  items?: OrderItem[];
}

// --- OrderItem ---
export interface OrderItem {
  id: number;
  order?: Order;
  product?: Product;
  quantity: number;
  price: number;
}

// --- Shipment ---
export interface Shipment {
  id: number;
  order?: Order;
  warehouse: string;
  mode: string;
  status: string;
  customerRating?: number;
  productImportance?: string;
}

// --- Review ---
export interface Review {
  id: number;
  user?: User;
  product?: Product;
  starRating: number;
  helpfulnessVotes: number;
  sentiment: string;
}

// --- CustomerProfile ---
export interface CustomerProfile {
  id: number;
  user?: User;
  gender: string;
  age: number;
  city: string;
  membershipType: string;
  totalSpend: number;
  itemsPurchased: number;
  avgRating: number;
  satisfactionLevel: string;
}

// --- Chat ---
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sql?: string;
  isLoading?: boolean;
}

// --- Pagination ---
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
