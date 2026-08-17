import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { AUTH_API_BASE_URL } from '../../http/auth-api-base-url.token';
import { CaptchaChallenge, CaptchaGenerationOptions } from '../domain/captcha.model';
import { CaptchaRepository } from '../domain/captcha.repository';

const DEFAULT_CAPTCHA_OPTIONS: Required<CaptchaGenerationOptions> = {
    colorFondoHex: '#0E2233',
    colorTextoHex: '#E7F1F3',
    ttlSegundos: 180,
    longitud: 5
};

interface ApiErrorDto {
    message?: string | null;
    detail?: string | null;
}

interface ApiResponseDto<T> {
    success?: boolean;
    data?: T | null;
    errors?: ApiErrorDto[] | null;
}

interface CaptchaChallengeResponseDto {
    // challengeId es el nombre natural del nuevo contrato. Los aliases permiten
    // convivir con respuestas de transición del servicio sin romper el frontend.
    challengeId?: string | null;
    captchaId?: string | null;
    id?: string | null;
    imageBase64: string | null;
    expiresInSeconds?: number | null;
    ttlSeconds?: number | null;
}


interface ProblemDetailsDto {
    title?: string | null;
    detail?: string | null;
    status?: number | null;
    errors?: ApiErrorDto[] | null;
}

@Injectable()
export class CaptchaApiRepository extends CaptchaRepository {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(AUTH_API_BASE_URL).replace(/\/$/, '');
    private readonly captchaBaseUrl = `${this.baseUrl}/api/v1/auth/captcha/challenges`;

    /** POST /api/v1/auth/captcha/challenges */
    override generate(
        options: CaptchaGenerationOptions = DEFAULT_CAPTCHA_OPTIONS
    ): Observable<CaptchaChallenge> {
        const params = this.createParams({ ...DEFAULT_CAPTCHA_OPTIONS, ...options });

        return this.http
            .post<ApiResponseDto<CaptchaChallengeResponseDto> | CaptchaChallengeResponseDto>(
                this.captchaBaseUrl,
                {},
                { params }
            )
            .pipe(
                map((response) => this.unwrapResponse(response, 'No se pudo generar el captcha.')),
                map((response) => this.toChallenge(response)),
                catchError((error: unknown) =>
                    this.handleError(error, 'No se pudo generar el captcha.')
                )
            );
    }

    private createParams(options: Required<CaptchaGenerationOptions>): HttpParams {
        return new HttpParams()
            .set('colorFondoHex', options.colorFondoHex)
            .set('colorTextoHex', options.colorTextoHex)
            .set('ttlSegundos', options.ttlSegundos)
            .set('longitud', options.longitud);
    }

    private unwrapResponse<T>(
        response: ApiResponseDto<T> | T,
        fallbackMessage: string
    ): T {
        if (!this.isApiResponse(response)) {
            return response;
        }

        if (response.success !== false && response.data != null) {
            return response.data;
        }

        const message = response.errors
            ?.map((error) => error.detail || error.message)
            .find((candidate): candidate is string => Boolean(candidate?.trim()));

        throw new Error(message?.trim() || fallbackMessage);
    }

    private isApiResponse<T>(value: ApiResponseDto<T> | T): value is ApiResponseDto<T> {
        return Boolean(
            value &&
            typeof value === 'object' &&
            ('data' in value || 'success' in value || 'errors' in value)
        );
    }

    private toChallenge(response: CaptchaChallengeResponseDto): CaptchaChallenge {
        const id = response.challengeId ?? response.captchaId ?? response.id;

        if (!id || !response.imageBase64) {
            throw new Error('La respuesta del servicio de captcha no contiene id o imagen.');
        }

        const ttlSeconds = this.resolveExpirationSeconds(response);

        return {
            id,
            imageBase64: response.imageBase64,
            imageDataUrl: this.toDataUrl(response.imageBase64),
            ttlSeconds,
            expiresAt: new Date(Date.now() + ttlSeconds * 1000)
        };
    }

    private resolveExpirationSeconds(response: CaptchaChallengeResponseDto): number {
        const seconds = Number(response.expiresInSeconds ?? response.ttlSeconds);

        if (!Number.isFinite(seconds) || seconds <= 0) {
            throw new Error('La respuesta del servicio de captcha no contiene una caducidad válida.');
        }

        return seconds;
    }

    private toDataUrl(imageBase64: string): string {
        if (imageBase64.startsWith('data:image/')) {
            return imageBase64;
        }

        return `data:image/png;base64,${imageBase64}`;
    }

    private handleError(error: unknown, fallbackMessage: string): Observable<never> {
        if (error instanceof HttpErrorResponse) {
            const problem = error.error as ProblemDetailsDto | null;
            const apiError = problem?.errors
                ?.map((item) => item.detail || item.message)
                .find((candidate): candidate is string => Boolean(candidate?.trim()));
            const message = apiError || problem?.detail || problem?.title || fallbackMessage;

            return throwError(() => new Error(message));
        }

        if (error instanceof Error) {
            return throwError(() => error);
        }

        return throwError(() => new Error(fallbackMessage));
    }
}
