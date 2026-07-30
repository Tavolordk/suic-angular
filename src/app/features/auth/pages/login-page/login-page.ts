import { CommonModule } from '@angular/common';
import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';
import { Router } from '@angular/router';

import {
    CONTACT_PHONE_LENGTH,
    contactMethodValidator,
    isValidNationalPhone
} from './contact-method.validator';

import { AuthService } from '../../../../core/auth/auth.service';
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
        FigmaOrbitalBackgroundComponent
    ],
    templateUrl: './login-page.html',
    styleUrl: './login-page.scss'
})
export class LoginPage implements OnDestroy {
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);

    protected readonly captcha = inject(CaptchaFacade);

    readonly currentYear = new Date().getFullYear();
    readonly captchaLength = CAPTCHA_LENGTH;
    readonly contactPhoneLength = CONTACT_PHONE_LENGTH;

    /** El campo se esta usando como telefono (solo digitos), no como correo. */
    readonly contactIsPhone = signal(false);

    readonly loginError = signal('');
    readonly submitted = signal(false);
    readonly isSubmitting = signal(false);

    readonly form = this.fb.group({
        usuario: ['', [Validators.required, Validators.maxLength(80)]],

        contacto: [
            '',
            [
                Validators.required,
                Validators.maxLength(120),
                contactMethodValidator
            ]
        ],

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

    ngOnDestroy(): void {
        this.captcha.deactivate();
    }

    get usuario(): AbstractControl | null {
        return this.form.get('usuario');
    }

    get contacto(): AbstractControl | null {
        return this.form.get('contacto');
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

    /**
     * El campo acepta correo o telefono. Mientras el valor sea unicamente
     * numerico se asume telefono nacional y se corta de forma dura en 10
     * digitos: el validador por si solo marca el error pero no impide seguir
     * escribiendo ni pegar 15 digitos de golpe.
     *
     * El corte se levanta en cuanto aparece un caracter no numerico, de modo
     * que un correo como 5512345678@dominio.com se sigue pudiendo capturar.
     */
    onContactInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const raw = input.value;
        const trimmed = raw.trim();
        const isPhone = /^\d+$/.test(trimmed);

        this.contactIsPhone.set(isPhone);

        const normalized = isPhone
            ? trimmed.slice(0, CONTACT_PHONE_LENGTH)
            : raw;

        if (normalized !== raw) {
            const caret = Math.min(
                input.selectionStart ?? normalized.length,
                normalized.length
            );

            input.value = normalized;
            input.setSelectionRange(caret, caret);
        }

        // Se sincroniza siempre para que el control no conserve el valor largo
        // que el ControlValueAccessor pudo haber escrito antes de este handler.
        if (this.form.controls.contacto.value !== normalized) {
            this.form.controls.contacto.setValue(normalized, {
                emitEvent: false
            });
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
        const contacto = String(value.contacto ?? '').trim();
        const esTelefono = isValidNationalPhone(contacto);

        this.authService
            .login({
                usuario: value.usuario ?? '',
                correo: esTelefono ? '' : contacto.toLowerCase(),
                telefono: esTelefono ? contacto : '',
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
