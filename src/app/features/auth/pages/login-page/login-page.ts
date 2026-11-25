import { CommonModule } from '@angular/common';
import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';
import { Router } from '@angular/router';

import { isValidEmail } from './contact-method.validator';

import { AuthService } from '../../../../core/auth/auth.service';
import { TermsDialog } from '../../../../shared/components/terms-dialog/terms-dialog';
import {
    CAPTCHA_LENGTH,
    CaptchaFacade
} from '../../../../core/captcha/application/captcha.facade';
import {
    FigmaOrbitalBackgroundComponent
} from '../../components/figma-orbital-background/figma-orbital-background.component';

@Component({
    selector: 'app-login-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FigmaOrbitalBackgroundComponent,
        TermsDialog
    ],
    templateUrl: './login-page.html',
    styleUrl: './login-page.scss'
})
export class LoginPage implements OnDestroy {
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    protected readonly auth = this.authService;

    protected readonly captcha = inject(CaptchaFacade);

    readonly currentYear = new Date().getFullYear();
    readonly captchaLength = CAPTCHA_LENGTH;
    readonly channel = signal<'telegram' | 'correo'>('telegram');

    readonly termsOpen = signal(false);
    readonly loginError = signal('');
    readonly submitted = signal(false);
    readonly isSubmitting = signal(false);

    readonly form = this.fb.group({
        usuario: ['', [Validators.required, Validators.maxLength(80)]],

        telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
        correo: [{ value: '', disabled: true }, [
            Validators.required, Validators.maxLength(120),
            (control: AbstractControl) => isValidEmail(String(control.value ?? '')) ? null : { email: true }
        ]],

        captcha: [
                '',
                [
                    Validators.required,
                    Validators.pattern(new RegExp(`^[A-Z0-9]{${CAPTCHA_LENGTH}}$`))
                ]
            ],

        aceptaTerminos: [false, [Validators.requiredTrue]]
    });

    constructor() {
        let previousChallengeId: string | null = null;

        // Cada vez que el backend emite un captcha nuevo (manual o por caducidad)
        // se limpia la respuesta anterior para no enviar un código ya inválido.
        effect(() => {
            const currentChallengeId = this.captcha.challenge()?.id ?? null;

            if (
                previousChallengeId &&
                currentChallengeId &&
                previousChallengeId !== currentChallengeId
            ) {
                this.form.controls.captcha.setValue('', { emitEvent: false });
            }

            previousChallengeId = currentChallengeId;
        });

        this.captcha.load();
    }

    openTerms(): void {
        this.termsOpen.set(true);
    }

    closeTerms(): void {
        this.termsOpen.set(false);
    }

    ngOnDestroy(): void {
        this.captcha.deactivate();
    }

    get usuario(): AbstractControl | null {
        return this.form.get('usuario');
    }


    get captchaControl(): AbstractControl | null {
        return this.form.get('captcha');
    }

    get aceptaTerminos(): AbstractControl | null {
        return this.form.get('aceptaTerminos');
    }

    protected get isBusy(): boolean {
        return this.isSubmitting() || this.captcha.loading() || this.captcha.verifying();
    }

    refreshCaptcha(): void {
        if (this.isBusy) {
            return;
        }

        this.loginError.set('');
        this.authService.clearError();
        this.form.patchValue({ captcha: '' }, { emitEvent: false });
        this.captcha.refresh();
    }

    selectChannel(channel: 'telegram' | 'correo'): void {
        if (this.isBusy || channel === this.channel()) return;
        this.channel.set(channel);
        const { telefono, correo } = this.form.controls;
        if (channel === 'telegram') {
            correo.disable();
            telefono.enable();
        } else {
            telefono.disable();
            correo.enable();
        }
        this.loginError.set('');
        this.authService.clearError();
    }

    onCaptchaInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const normalized = input.value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, CAPTCHA_LENGTH);

        input.value = normalized;
        this.form.patchValue({ captcha: normalized }, { emitEvent: false });
        this.loginError.set('');
    }

    submit(): void {
        if (this.isBusy) {
            return;
        }

        this.submitted.set(true);
        this.loginError.set('');

        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return;
        }

        if (!this.captcha.challenge() || this.captcha.isExpired()) {
            this.loginError.set('Genera y resuelve un CAPTCHA vigente para continuar.');
            this.captcha.refresh();
            return;
        }

        const value = this.form.getRawValue();

        this.isSubmitting.set(true);

        // El servicio valida primero el CAPTCHA contra el backend y solo entonces
        // solicita el código de un solo uso.

        this.authService
            .login({
                usuario: value.usuario ?? '',
                correo: this.channel() === 'correo' ? (value.correo ?? '').trim().toLowerCase() : '',
                telefono: this.channel() === 'telegram' ? value.telefono ?? '' : '',
                captcha: value.captcha ?? ''
            })
            .subscribe({
                next: () => {
                    this.isSubmitting.set(false);
                    this.router.navigateByUrl('/autenticacion');
                },

                error: (error: unknown) => {
                    this.isSubmitting.set(false);
                    this.loginError.set(this.getErrorMessage(error));
                }
            });
    }

    shouldShowError(control: AbstractControl | null): boolean {
        return Boolean(
            control &&
            control.invalid &&
            (control.dirty || control.touched || this.submitted())
        );
    }

    private getErrorMessage(error: unknown): string {
        return error instanceof Error
            ? error.message
            : 'No fue posible enviar el código. Intenta nuevamente.';
    }
}
