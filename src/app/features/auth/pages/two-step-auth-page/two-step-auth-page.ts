import {
    CommonModule,
    isPlatformBrowser
} from '@angular/common';

import {
    Component,
    ElementRef,
    OnInit,
    PLATFORM_ID,
    QueryList,
    ViewChildren,
    computed,
    inject,
    signal
} from '@angular/core';

import {
    FormArray,
    FormBuilder,
    FormControl,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';

import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import {
    AuthService
} from '../../../../core/auth/auth.service';

import {
    FigmaOrbitalBackgroundComponent
} from '../../components/figma-orbital-background/figma-orbital-background.component';

@Component({
    selector: 'app-two-step-auth-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FigmaOrbitalBackgroundComponent
    ],
    templateUrl: './two-step-auth-page.html',
    styleUrl: './two-step-auth-page.scss'
})
export class TwoStepAuthPage implements OnInit {
    @ViewChildren('codeInput')
    private readonly codeInputs?:
        QueryList<ElementRef<HTMLInputElement>>;

    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);

    private readonly authService =
        inject(AuthService);

    private readonly isBrowser =
        isPlatformBrowser(
            inject(PLATFORM_ID)
        );

    readonly submitted = signal(false);
    readonly authError = signal('');
    readonly resendMessage = signal('');
    readonly isVerifying = signal(false);
    readonly isResending = signal(false);

    readonly contactDestination =
        computed(() => {
            const pendingContact =
                this.authService.pendingContact();

            return (
                pendingContact
                    ?.contactoEnmascarado ||
                pendingContact
                    ?.medioContacto ||
                'tu medio de contacto'
            );
        });

    readonly deliveryMethod =
        computed(() => {
            const medioContacto =
                this.authService
                    .pendingContact()
                    ?.medioContacto ?? '';

            return medioContacto.includes('@')
                ? 'por correo a'
                : 'por SMS al';
        });

    readonly form = this.fb.group({
        code: this.fb.array(
            Array.from(
                {
                    length: 6
                },
                () =>
                    this.fb.control(
                        '',
                        [
                            Validators.required,
                            Validators.pattern(
                                /^\d$/
                            )
                        ]
                    )
            )
        )
    });

    ngOnInit(): void {
        if (!this.isBrowser) {
            return;
        }

        if (
            this.authService
                .isAuthenticated()
        ) {
            this.router.navigateByUrl(
                '/busqueda'
            );

            return;
        }

        if (
            !this.authService
                .pendingContact()
        ) {
            this.router.navigateByUrl(
                '/login'
            );
        }
    }

    get codeArray():
        FormArray<FormControl<string | null>> {
        return this.form.get(
            'code'
        ) as FormArray<
            FormControl<string | null>
        >;
    }

    get codeControls():
        FormControl<string | null>[] {
        return this.codeArray.controls;
    }

    onCodeInput(
        event: Event,
        index: number
    ): void {
        const input =
            event.target as HTMLInputElement;

        const value = input.value
            .replace(/\D/g, '')
            .slice(-1);

        input.value = value;

        this.codeArray
            .at(index)
            .setValue(value);

        this.authError.set('');

        if (
            value &&
            index <
            this.codeControls.length - 1
        ) {
            this.focusInput(index + 1);
        }
    }

    onCodeKeydown(
        event: KeyboardEvent,
        index: number
    ): void {
        const input =
            event.target as HTMLInputElement;

        if (
            event.key === 'Backspace' &&
            !input.value &&
            index > 0
        ) {
            this.focusInput(index - 1);
            return;
        }

        if (
            event.key === 'ArrowLeft' &&
            index > 0
        ) {
            event.preventDefault();

            this.focusInput(index - 1);
            return;
        }

        if (
            event.key === 'ArrowRight' &&
            index <
            this.codeControls.length - 1
        ) {
            event.preventDefault();

            this.focusInput(index + 1);
        }
    }

    onPaste(
        event: ClipboardEvent
    ): void {
        event.preventDefault();

        const pastedCode =
            event.clipboardData
                ?.getData('text')
                .replace(/\D/g, '')
                .slice(0, 6);

        if (!pastedCode) {
            return;
        }

        pastedCode
            .split('')
            .forEach(
                (
                    digit,
                    index
                ) => {
                    this.codeArray
                        .at(index)
                        .setValue(digit);
                }
            );

        this.codeInputs?.forEach(
            (
                inputRef,
                index
            ) => {
                inputRef.nativeElement.value =
                    pastedCode[index] ?? '';
            }
        );

        this.focusInput(
            Math.min(
                pastedCode.length,
                6
            ) - 1
        );
    }

    verifyAndLogin(): void {
        if (this.isVerifying()) {
            return;
        }

        this.submitted.set(true);
        this.authError.set('');
        this.resendMessage.set('');

        this.form.markAllAsTouched();

        if (this.form.invalid) {
            this.authError.set(
                'Ingresa los 6 dígitos del código.'
            );

            return;
        }

        const code =
            this.codeArray.value.join('');

        if (code.length !== 6) {
            this.authError.set(
                'Código inválido.'
            );

            return;
        }

        this.isVerifying.set(true);

        this.authService
            .verifyContactCode(code)
            .pipe(
                finalize(() =>
                    this.isVerifying.set(false)
                )
            )
            .subscribe({
                next: () => {
                    this.router.navigateByUrl(
                        '/busqueda'
                    );
                },

                error: (error: unknown) => {
                    this.authError.set(
                        this.getErrorMessage(
                            error
                        )
                    );

                    this.clearCode();
                }
            });
    }

    resendCode(): void {
        if (this.isResending()) {
            return;
        }

        this.authError.set('');
        this.resendMessage.set('');
        this.isResending.set(true);

        this.authService
            .resendContactCode()
            .pipe(
                finalize(() =>
                    this.isResending.set(false)
                )
            )
            .subscribe({
                next: () => {
                    this.resendMessage.set(
                        'Código reenviado correctamente.'
                    );

                    this.clearCode();

                    setTimeout(() => {
                        this.resendMessage.set('');
                    }, 2500);
                },

                error: (error: unknown) => {
                    this.authError.set(
                        this.getErrorMessage(
                            error
                        )
                    );
                }
            });
    }

    backToLogin(): void {
        this.authService
            .cancelPendingAuthentication();

        this.router.navigateByUrl(
            '/login'
        );
    }

    shouldShowCodeError(): boolean {
        return (
            this.submitted() &&
            this.form.invalid
        );
    }

    private clearCode(): void {
        this.form.reset({
            code: [
                '',
                '',
                '',
                '',
                '',
                ''
            ]
        });

        this.submitted.set(false);

        this.codeInputs?.forEach(
            (inputRef) => {
                inputRef.nativeElement.value =
                    '';
            }
        );

        setTimeout(() =>
            this.focusInput(0)
        );
    }

    private focusInput(
        index: number
    ): void {
        const input =
            this.codeInputs
                ?.get(index)
                ?.nativeElement;

        if (!input) {
            return;
        }

        input.focus();
        input.select();
    }

    private getErrorMessage(
        error: unknown
    ): string {
        return error instanceof Error
            ? error.message
            : 'No fue posible validar el código. Intenta nuevamente.';
    }
}