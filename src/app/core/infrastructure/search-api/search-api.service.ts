import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { SEARCH_API_BASE_URL } from './search-api.config';
import {
  ApiResponse,
  SearchRequest,
  SearchResultDetailResponse,
  SearchResultsPageResponse
} from './search-api.models';

@Injectable({ providedIn: 'root' })
export class SearchApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiBaseUrl = inject(SEARCH_API_BASE_URL);

  executeSearch(
    request: SearchRequest,
    pageSize: number
  ): Observable<SearchResultsPageResponse> {
    return this.http
      .post<ApiResponse<SearchResultsPageResponse>>(
        `${this.apiBaseUrl}/search`,
        request,
        {
          headers: this.createHeaders(),
          params: { pageSize }
        }
      )
      .pipe(map((response) => this.unwrap(response, 'No fue posible ejecutar la búsqueda.')));
  }

  getResults(
    searchId: string,
    page: number,
    pageSize: number
  ): Observable<SearchResultsPageResponse> {
    return this.http
      .get<ApiResponse<SearchResultsPageResponse>>(
        `${this.apiBaseUrl}/search/${encodeURIComponent(searchId)}/results`,
        {
          headers: this.createHeaders(),
          params: { page, pageSize }
        }
      )
      .pipe(map((response) => this.unwrap(response, 'No fue posible cargar los resultados.')));
  }

  getResultDetail(
    searchId: string,
    resultId: string
  ): Observable<SearchResultDetailResponse> {
    return this.http
      .get<ApiResponse<SearchResultDetailResponse>>(
        `${this.apiBaseUrl}/search/${encodeURIComponent(searchId)}/results/${encodeURIComponent(resultId)}`,
        { headers: this.createHeaders() }
      )
      .pipe(map((response) => this.unwrap(response, 'No fue posible cargar el perfil.')));
  }

  private createHeaders(): HttpHeaders {
    const session = this.authService.session();
    if (!session?.accessToken) {
      return new HttpHeaders({ Accept: 'application/json' });
    }

    return new HttpHeaders({
      Accept: 'application/json',
      Authorization: `${session.tokenType || 'Bearer'} ${session.accessToken}`
    });
  }

  private unwrap<T>(response: ApiResponse<T>, fallbackMessage: string): T {
    if (!response?.success || response.data == null) {
      throw new Error(response?.message?.trim() || fallbackMessage);
    }

    return response.data;
  }
}
