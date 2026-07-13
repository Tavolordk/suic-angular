import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
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
export class LoginPage implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);

    readonly currentYear = new Date().getFullYear();

    readonly captchaCode = signal(
        this.createCaptcha()
    );

    readonly captchaMismatch = signal(false);
    readonly loginError = signal('');
    readonly submitted = signal(false);
    readonly isSubmitting = signal(false);

    readonly form = this.fb.group(
        {
            usuario: [
                '',
                [
                    Validators.required,
                    Validators.maxLength(80)
                ]
            ],

            correo: [
                '',
                [
                    Validators.maxLength(120),
                    this.emailValidator
                ]
            ],

            telefono: [
                '',
                [
                    Validators.maxLength(10),
                    this.phoneValidator
                ]
            ],

            captcha: [
                '',
                [
                    Validators.required,
                    Validators.maxLength(6)
                ]
            ],

            aceptaTerminos: [
                false,
                [
                    Validators.requiredTrue
                ]
            ]
        },
        {
            validators: [
                this.contactValidator
            ]
        }
    );

    ngOnInit(): void {
        if (
            this.authService.isAuthenticated()
        ) {
            this.router.navigateByUrl(
                '/busqueda'
            );
        }
    }

    get usuario(): AbstractControl | null {
        return this.form.get('usuario');
    }

    get correo(): AbstractControl | null {
        return this.form.get('correo');
    }

    get telefono(): AbstractControl | null {
        return this.form.get('telefono');
    }

    get captcha(): AbstractControl | null {
        return this.form.get('captcha');
    }

    get aceptaTerminos():
        AbstractControl | null {
        return this.form.get(
            'aceptaTerminos'
        );
    }

    refreshCaptcha(): void {
        this.captchaCode.set(
            this.createCaptcha()
        );

        this.captchaMismatch.set(false);

        this.form.patchValue({
            captcha: ''
        });

        this.captcha?.setErrors(null);
    }

    onPhoneInput(event: Event): void {
        const input =
            event.target as HTMLInputElement;

        const onlyDigits = input.value
            .replace(/\D/g, '')
            .slice(0, 10);

        input.value = onlyDigits;

        this.form.patchValue(
            {
                telefono: onlyDigits
            },
            {
                emitEvent: false
            }
        );
    }

    onCaptchaInput(event: Event): void {
        const input =
            event.target as HTMLInputElement;

        const normalized = input.value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 6);

        input.value = normalized;

        this.form.patchValue(
            {
                captcha: normalized
            },
            {
                emitEvent: false
            }
        );

        this.captchaMismatch.set(false);
    }

    submit(): void {
        if (this.isSubmitting()) {
            return;
        }

        this.submitted.set(true);
        this.loginError.set('');
        this.captchaMismatch.set(false);

        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return;
        }

        const value =
            this.form.getRawValue();

        const typedCaptcha =
            value.captcha
                ?.trim()
                .toUpperCase() ?? '';

        if (
            typedCaptcha !==
            this.captchaCode()
        ) {
            this.captchaMismatch.set(true);

            this.captcha?.setErrors({
                captchaMismatch: true
            });

            return;
        }

        this.isSubmitting.set(true);

        this.authService
            .requestContactCode({
                usuario:
                    value.usuario ?? '',

                correo:
                    value.correo ?? '',

                telefono:
                    value.telefono ?? ''
            })
            .pipe(
                finalize(() =>
                    this.isSubmitting.set(false)
                )
            )
            .subscribe({
                next: () => {
                    this.router.navigateByUrl(
                        '/autenticacion'
                    );
                },

                error: (error: unknown) => {
                    this.loginError.set(
                        this.getErrorMessage(
                            error
                        )
                    );

                    this.refreshCaptcha();
                }
            });
    }

    shouldShowError(
        control: AbstractControl | null
    ): boolean {
        return Boolean(
            control &&
            control.invalid &&
            (
                control.touched ||
                this.submitted()
            )
        );
    }

    private contactValidator(
        control: AbstractControl
    ): ValidationErrors | null {
        const correo = String(
            control.get('correo')?.value ??
            ''
        ).trim();

        const telefono = String(
            control.get('telefono')?.value ??
            ''
        ).trim();

        return correo || telefono
            ? null
            : {
                contactRequired: true
            };
    }

    private emailValidator(
        control: AbstractControl
    ): ValidationErrors | null {
        const value = String(
            control.value ?? ''
        ).trim();

        if (!value) {
            return null;
        }

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        return emailRegex.test(value)
            ? null
            : {
                email: true
            };
    }

    private phoneValidator(
        control: AbstractControl
    ): ValidationErrors | null {
        const value = String(
            control.value ?? ''
        ).trim();

        if (!value) {
            return null;
        }

        return /^\d{10}$/.test(value)
            ? null
            : {
                phone: true
            };
    }

    private createCaptcha(): string {
        const alphabet =
            'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

        return Array.from(
            {
                length: 6
            },
            () =>
                alphabet[
                Math.floor(
                    Math.random() *
                    alphabet.length
                )
                ]
        ).join('');
    }

    private getErrorMessage(
        error: unknown
    ): string {
        return error instanceof Error
            ? error.message
            : 'No fue posible enviar el código. Intenta nuevamente.';
    }
}