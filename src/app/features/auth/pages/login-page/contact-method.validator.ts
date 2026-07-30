import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const PHONE_PATTERN = /^\d{10}$/;
const DIGITS_ONLY_PATTERN = /^\d+$/;
const PHONE_LIKE_PATTERN = /^[+\d\s().-]+$/;

// Admite los formatos de correo de uso común: puntos, guiones, guion bajo,
// porcentaje y etiquetas con +, además de subdominios.
const EMAIL_PATTERN = /^(?=.{1,254}$)(?=.{1,64}@)[a-z0-9]+(?:[._%+-][a-z0-9]+)*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export const CONTACT_PHONE_LENGTH = 10;

export function isValidNationalPhone(value: string): boolean {
    return PHONE_PATTERN.test(value);
}

export function isValidEmail(value: string): boolean {
    return EMAIL_PATTERN.test(value);
}

/**
 * Valida un único campo que puede contener:
 * - Un teléfono nacional de exactamente 10 dígitos.
 * - Un correo electrónico válido.
 *
 * No normaliza ni elimina prefijos, espacios, guiones o paréntesis. De esta
 * manera, +52, 0052 y teléfonos formateados se rechazan en lugar de aceptarse
 * silenciosamente.
 */
export const contactMethodValidator: ValidatorFn = (
    control: AbstractControl
): ValidationErrors | null => {
    const value = String(control.value ?? '');

    if (!value) {
        return null;
    }

    if (!value.trim()) {
        return { required: true };
    }

    if (DIGITS_ONLY_PATTERN.test(value)) {
        return isValidNationalPhone(value)
            ? null
            : {
                phoneLength: {
                    requiredLength: CONTACT_PHONE_LENGTH,
                    actualLength: value.length
                }
            };
    }

    if (PHONE_LIKE_PATTERN.test(value)) {
        return { phoneFormat: true };
    }

    if (value.includes('@')) {
        return isValidEmail(value) ? null : { emailFormat: true };
    }

    return { contactMethod: true };
};
