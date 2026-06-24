import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { AuthSession, LoginPayload } from './auth-session.model';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly storageKey = 'suic-auth-session';
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private readonly sessionState = signal<AuthSession | null>(this.readStoredSession());

    readonly session = this.sessionState.asReadonly();
    readonly isAuthenticated = computed(() => Boolean(this.sessionState()));
    readonly displayName = computed(() => this.sessionState()?.displayName ?? 'Usuario');

    login(payload: LoginPayload): void {
        const usuario = payload.usuario.trim();
        const correo = payload.correo.trim().toLowerCase();
        const telefono = payload.telefono.trim();

        const session: AuthSession = {
            usuario,
            correo,
            telefono,
            displayName: usuario || correo || telefono || 'Usuario',
            issuedAt: new Date().toISOString()
        };

        this.sessionState.set(session);
        this.persistSession(session);
    }

    logout(): void {
        this.sessionState.set(null);

        if (this.isBrowser) {
            localStorage.removeItem(this.storageKey);
        }
    }

    private readStoredSession(): AuthSession | null {
        if (!this.isBrowser) {
            return null;
        }

        const rawSession = localStorage.getItem(this.storageKey);

        if (!rawSession) {
            return null;
        }

        try {
            return JSON.parse(rawSession) as AuthSession;
        } catch {
            localStorage.removeItem(this.storageKey);
            return null;
        }
    }

    private persistSession(session: AuthSession): void {
        if (!this.isBrowser) {
            return;
        }

        localStorage.setItem(this.storageKey, JSON.stringify(session));
    }
}