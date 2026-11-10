import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';
import { SEARCH_API_BASE_URL } from './search-api.config';
import {
  ApiResponse,
  SearchRequest,
  PivotRequest,
  SearchResultDetailResponse,
  SearchResultsPageResponse,
  SavedSearchResponse,
  SearchHistoryPageResponse
} from './search-api.models';

@Injectable({ providedIn: 'root' })
export class SearchApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(SEARCH_API_BASE_URL);

  /** POST /api/search - el Bearer lo agrega authTokenInterceptor. */
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

  /** GET /api/search/history - historial de resultados temporales del titular del Bearer. */
  getSearchHistory(page = 1, pageSize = 18): Observable<SearchHistoryPageResponse> {
    return this.http.get<ApiResponse<SearchHistoryPageResponse>>(
      `${this.apiBaseUrl}/search/history`,
      { headers: this.createHeaders(), params: { page, pageSize } }
    ).pipe(map(response => this.unwrap(response, 'No fue posible consultar el historial reciente.')));
  }

  /**
   * Apertura de historial con resultsUrl devuelta por el servidor.
   * Se restringe a la ruta de resultados de su propio searchId para evitar
   * redirecciones externas, tokens enviados a otros hosts o rutas inesperadas.
   */
  getHistoryResults(
    resultsUrl: string, searchId: string, page = 1, pageSize = 18
  ): Observable<SearchResultsPageResponse> {
    const match = /^\/api\/search\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\/results\/?$/i.exec(resultsUrl?.trim() ?? '');
    if (!match || match[1].toLowerCase() !== searchId.toLowerCase()) {
      return throwError(() => new Error('La ruta de resultados recibida no corresponde a la búsqueda seleccionada.'));
    }
    // apiBaseUrl ya contiene /api; sólo se usa la ruta relativa validada.
    const pathUnderApi = match[0].slice('/api'.length);
    return this.http.get<ApiResponse<SearchResultsPageResponse>>(
      `${this.apiBaseUrl}${pathUnderApi}`,
      { headers: this.createHeaders(), params: { page, pageSize } }
    ).pipe(map(response => this.unwrap(response, 'No fue posible recuperar la búsqueda reciente.')));
  }

  /** GET /api/search/{searchId}/results - el Bearer lo agrega authTokenInterceptor. */
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

  /** GET /api/search/{searchId}/results/{resultId} - Bearer global. */
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

  /** POST /api/search/{searchId}/results/{resultId}/links/{linkId}/pivot?pageSize=18. */
  pivotLink(
    searchId: string,
    resultId: string,
    linkId: string,
    pageSize = 18
  ): Observable<SearchResultsPageResponse> {
    const body: PivotRequest = {
      options: {
        includeTrace: true,
        includeContextualCandidates: true
      }
    };

    return this.http
      .post<ApiResponse<SearchResultsPageResponse>>(
        `${this.apiBaseUrl}/search/${encodeURIComponent(searchId)}/results/${encodeURIComponent(resultId)}/links/${encodeURIComponent(linkId)}/pivot`,
        body,
        {
          headers: this.createHeaders(),
          params: { pageSize }
        }
      )
      .pipe(map((response) => this.unwrap(response, 'No fue posible buscar a partir de este vínculo.')));
  }

  /** POST sin body: conservar el searchId temporal, sin alterar su TTL ni ejecutar otra búsqueda. */
  saveSearch(searchId: string): Observable<SavedSearchResponse> {
    return this.http.post<ApiResponse<SavedSearchResponse>>(
      `${this.apiBaseUrl}/search/${encodeURIComponent(searchId)}/save`,
      null,
      { headers: this.createHeaders() }
    ).pipe(map((response) => this.unwrap(response, 'No fue posible guardar la búsqueda.')));
  }

  /** Lectura histórica: utiliza el mismo contrato de página que Search temporal. */
  getSavedResults(searchId: string, page = 1, pageSize = 18): Observable<SearchResultsPageResponse> {
    return this.http.get<ApiResponse<SearchResultsPageResponse>>(
      `${this.apiBaseUrl}/saved-searches/${encodeURIComponent(searchId)}/results`,
      { headers: this.createHeaders(), params: { page, pageSize } }
    ).pipe(map((response) => this.unwrap(response, 'No fue posible recuperar la búsqueda guardada.')));
  }

  /** Detalle histórico: conservar los IDs originales para evidencias y vínculos. */
  getSavedResultDetail(searchId: string, resultId: string): Observable<SearchResultDetailResponse> {
    return this.http.get<ApiResponse<SearchResultDetailResponse>>(
      `${this.apiBaseUrl}/saved-searches/${encodeURIComponent(searchId)}/results/${encodeURIComponent(resultId)}`,
      { headers: this.createHeaders() }
    ).pipe(map((response) => this.unwrap(response, 'No fue posible recuperar el detalle guardado.')));
  }

  /** Pivote sobre vínculo histórico real. La respuesta es una búsqueda HIJA temporal. */
  pivotSavedLink(searchId: string, resultId: string, linkId: string, pageSize = 18): Observable<SearchResultsPageResponse> {
    const body: PivotRequest = {
      options: { includeTrace: false, includeContextualCandidates: true }
    };
    return this.http.post<ApiResponse<SearchResultsPageResponse>>(
      `${this.apiBaseUrl}/saved-searches/${encodeURIComponent(searchId)}/results/${encodeURIComponent(resultId)}/links/${encodeURIComponent(linkId)}/pivot`,
      body,
      { headers: this.createHeaders(), params: { pageSize } }
    ).pipe(map((response) => this.unwrap(response, 'No fue posible pivotear el vínculo guardado.')));
  }

  private createHeaders(): HttpHeaders {
    // Authorization se centraliza en authTokenInterceptor para evitar que cada
    // servicio tenga que leer/manipular la sesión por separado.
    return new HttpHeaders({ Accept: 'application/json' });
  }

  private unwrap<T>(response: ApiResponse<T>, fallbackMessage: string): T {
    if (!response?.success || response.data == null) {
      throw new Error(response?.errors?.find((error) => error?.code)?.code || response?.message?.trim() || fallbackMessage);
    }

    return response.data;
  }
}
