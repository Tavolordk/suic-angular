import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { SEARCH_API_BASE_URL } from './search-api.config';
import { ApiResponse } from './search-api.models';
import { PersonReportReceipt, PersonReportStatusResponse } from './person-report-api.models';

/** Reportes Person: el frontend sólo habla con el Motor. Bearer: authTokenInterceptor. */
@Injectable({ providedIn: 'root' })
export class PersonReportApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(SEARCH_API_BASE_URL);

  /** REP-02. POST sin body: Motor toma todas las tarjetas del snapshot temporal. */
  requestReport(searchId: string): Observable<PersonReportReceipt> {
    return this.http.post<ApiResponse<PersonReportReceipt>>(
      `${this.apiBaseUrl}/search/${encodeURIComponent(searchId)}/reports/general`,
      null,
      { headers: new HttpHeaders({ Accept: 'application/json' }) }
    ).pipe(map(response => this.unwrap(response, 'No fue posible solicitar el reporte PDF.')));
  }

  /** REP-03. GET por reportJobId, no por searchId ni datasetId. */
  getStatus(reportJobId: string): Observable<PersonReportStatusResponse> {
    return this.http.get<ApiResponse<PersonReportStatusResponse>>(
      `${this.apiBaseUrl}/reports/${encodeURIComponent(reportJobId)}`,
      { headers: new HttpHeaders({ Accept: 'application/json' }) }
    ).pipe(map(response => this.unwrap(response, 'No fue posible consultar el estado del reporte.')));
  }

  /** REP-04. Archivo binario con Bearer y metadatos HTTP, no un enlace público. */
  downloadReport(reportJobId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.apiBaseUrl}/reports/${encodeURIComponent(reportJobId)}/file`,
      {
        headers: new HttpHeaders({ Accept: 'application/pdf' }),
        observe: 'response',
        responseType: 'blob'
      }
    );
  }

  private unwrap<T>(response: ApiResponse<T>, fallback: string): T {
    if (!response?.success || response.data == null) {
      throw new Error(response?.errors?.find(e => e?.message)?.message ||
        response?.errors?.find(e => e?.code)?.code || response?.message?.trim() || fallback);
    }
    return response.data;
  }
}
