import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { CaptchaApiRepository } from './core/captcha/data-access/captcha-api.repository';
import { CaptchaRepository } from './core/captcha/domain/captcha.repository';
import { authTokenInterceptor } from './core/http/auth-token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch(), withInterceptors([authTokenInterceptor])),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    {
      provide: CaptchaRepository,
      useClass: CaptchaApiRepository
    }
  ]
};
