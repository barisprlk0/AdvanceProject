import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  // --- Generic CRUD ---
  getAll<T>(endpoint: string, params?: Record<string, string | number | boolean>): Observable<T[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    return this.http.get<T[]>(`${this.baseUrl}/${endpoint}`, { params: httpParams });
  }

  /**
   * Fetches a paginated slice of data from the backend.
   * Backend Pageable expected: ?page=0&size=10&sort=id,desc
   */
  getPage<T>(endpoint: string, page = 0, size = 10, params?: Record<string, string | number | boolean>): Observable<PageResponse<T>> {
    let httpParams = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    return this.http.get<PageResponse<T>>(`${this.baseUrl}/${endpoint}`, { params: httpParams });
  }

  getById<T>(endpoint: string, id: number | string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}/${id}`);
  }

  create<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body);
  }

  update<T>(endpoint: string, id: number | string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}/${id}`, body);
  }

  patch<T>(endpoint: string, id: number | string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${endpoint}/${id}`, body);
  }

  delete(endpoint: string, id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${endpoint}/${id}`);
  }
}
