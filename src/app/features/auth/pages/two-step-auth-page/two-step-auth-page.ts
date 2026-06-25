import { CommonModule } from '@angular/common';
import {
    Component,
    ElementRef,
    QueryList,
    ViewChildren,
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
import { FigmaOrbitalBackgroundComponent } from '../../components/figma-orbital-background/figma-orbital-background.component';

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
export class TwoStepAuthPage {
    @ViewChildren('codeInput')
    private readonly codeInputs?: QueryList<ElementRef<HTMLInputElement>>;

    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);

    readonly submitted = signal(false);
    readonly authError = signal('');
    readonly resendMessage = signal('');

    readonly form = this.fb.group({
        code: this.fb.array(
            Array.from(
                { length: 6 },
                () => this.fb.control('', [
                    Validators.required,
                    Validators.pattern(/^\d$/)
                ])
            )
        )
    });

    get codeArray(): FormArray<FormControl<string | null>> {
        return this.form.get('code') as FormArray<FormControl<string | null>>;
    }

    get codeControls(): FormControl<string | null>[] {
        return this.codeArray.controls;
    }

    onCodeInput(event: Event, index: number): void {
        const input = event.target as HTMLInputElement;
        const value = input.value.replace(/\D/g, '').slice(-1);

        input.value = value;
        this.codeArray.at(index).setValue(value);
        this.authError.set('');

        if (value && index < this.codeControls.length - 1) {
            this.focusInput(index + 1);
        }
    }

    onCodeKeydown(event: KeyboardEvent, index: number): void {
        const input = event.target as HTMLInputElement;

        if (event.key === 'Backspace' && !input.value && index > 0) {
            this.focusInput(index - 1);
            return;
        }

        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            this.focusInput(index - 1);
            return;
        }

        if (event.key === 'ArrowRight' && index < this.codeControls.length - 1) {
            event.preventDefault();
            this.focusInput(index + 1);
        }
    }

    onPaste(event: ClipboardEvent): void {
        event.preventDefault();

        const pastedCode = event.clipboardData
            ?.getData('text')
            .replace(/\D/g, '')
            .slice(0, 6);

        if (!pastedCode) {
            return;
        }

        pastedCode.split('').forEach((digit, index) => {
            this.codeArray.at(index).setValue(digit);
        });

        this.codeInputs?.forEach((inputRef, index) => {
            inputRef.nativeElement.value = pastedCode[index] ?? '';
        });

        this.focusInput(Math.min(pastedCode.length, 6) - 1);
    }

    verifyAndLogin(): void {
        this.submitted.set(true);
        this.authError.set('');
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            this.authError.set('Ingresa los 6 dígitos del código.');
            return;
        }

        const code = this.codeArray.value.join('');

        /*
         * Aquí después conectamos el endpoint real de validación OTP.
         * Por ahora dejamos pasar si trae los 6 dígitos para continuar el flujo visual.
         */
        if (code.length !== 6) {
            this.authError.set('Código inválido.');
            return;
        }

        this.router.navigateByUrl('/busqueda');
    }

    resendCode(): void {
        this.resendMessage.set('Código reenviado.');

        setTimeout(() => {
            this.resendMessage.set('');
        }, 2500);
    }

    backToLogin(): void {
        this.router.navigateByUrl('/login');
    }

    shouldShowCodeError(): boolean {
        return this.submitted() && this.form.invalid;
    }

    private focusInput(index: number): void {
        const input = this.codeInputs?.get(index)?.nativeElement;

        if (!input) {
            return;
        }

        input.focus();
        input.select();
    }
}