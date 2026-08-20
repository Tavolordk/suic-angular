import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiResponse } from '../search-api/search-api.models';
import { SEARCH_API_BASE_URL } from '../search-api/search-api.config';
import {
  ConsolidatedProfileResponse,
  ConsolidatedProfilesPageResponse,
  ConsolidateProfileRequest,
  ConsolidateProfileResult
} from './consolidated-profiles-api.models';

@Injectable({ providedIn: 'root' })
export class ConsolidatedProfilesApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(SEARCH_API_BASE_URL);

  /** POST /api/search/{searchId}/results/{resultId}/consolidations. */
  consolidateProfile(
    searchId: string,
    resultId: string,
    request: ConsolidateProfileRequest
  ): Observable<ConsolidateProfileResult> {
    return this.http
      .post<ApiResponse<ConsolidatedProfileResponse>>(
        `${this.apiBaseUrl}/search/${encodeURIComponent(searchId)}/results/${encodeURIComponent(resultId)}/consolidations`,
        request,
        { headers: this.createHeaders() }
      )
      .pipe(
        map((response) => {
          const profile = this.unwrap(
            response,
            'No fue posible guardar el perfil consolidado.'
          );

          return {
            profile,
            message:
              response.message?.trim() ||
              'Perfil consolidado guardado exitosamente.'
          };
        })
      );
  }

  /** GET /api/consolidated-profiles/{profileId}. */
  getProfile(profileId: string): Observable<ConsolidatedProfileResponse> {
    return this.http
      .get<ApiResponse<ConsolidatedProfileResponse>>(
        `${this.apiBaseUrl}/consolidated-profiles/${encodeURIComponent(profileId)}`,
        { headers: this.createHeaders() }
      )
      .pipe(
        map((response) =>
          this.unwrap(response, 'No fue posible cargar el perfil consolidado.')
        )
      );
  }

  /** GET /api/consolidated-profiles?page={page}&pageSize={pageSize}. */
  getProfiles(
    page = 1,
    pageSize = 18
  ): Observable<ConsolidatedProfilesPageResponse> {
    return this.http
      .get<ApiResponse<ConsolidatedProfilesPageResponse>>(
        `${this.apiBaseUrl}/consolidated-profiles`,
        {
          headers: this.createHeaders(),
          params: { page, pageSize }
        }
      )
      .pipe(
        map((response) =>
          this.unwrap(response, 'No fue posible cargar las líneas de investigación.')
        )
      );
  }

  private createHeaders(): HttpHeaders {
    // Authorization se agrega de forma centralizada mediante authTokenInterceptor.
    return new HttpHeaders({ Accept: 'application/json' });
  }

  private unwrap<T>(response: ApiResponse<T>, fallbackMessage: string): T {
    if (!response?.success || response.data == null) {
      throw new Error(response?.message?.trim() || fallbackMessage);
    }

    return response.data;
  }
}
