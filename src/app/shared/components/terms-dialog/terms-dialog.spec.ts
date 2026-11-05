import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TermsDialog } from './terms-dialog';

describe('TermsDialog', () => {
  let fixture: ComponentFixture<TermsDialog>;
  let component: TermsDialog;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TermsDialog] }).compileComponents();
    fixture = TestBed.createComponent(TermsDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('muestra el documento y sus fundamentos legales', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Términos y condiciones de uso');
    expect(text).toContain('SPM-1.0');
    expect(text).not.toContain('SPM-CONSULTA');
    expect(text).not.toContain('preparado el 5 de noviembre de 2026');
    expect(text).not.toContain('aprobación institucional');
    expect(text).toContain('Ley General de Protección de Datos Personales');
    expect(text).toContain('Ley General del Sistema Nacional de Seguridad Pública');
    expect(fixture.nativeElement.querySelector('[aria-modal="true"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.legal-modal__seal svg path')).toBeTruthy();
  });

  it('emite cierre al presionar Escape', () => {
    let closed = false;
    component.closed.subscribe(() => closed = true);
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBeTrue();
  });

  it('cierra solo al pulsar el fondo y no el contenido', () => {
    let closures = 0;
    component.closed.subscribe(() => closures++);
    const background = fixture.nativeElement.querySelector('.legal-backdrop') as HTMLElement;
    const dialog = fixture.nativeElement.querySelector('.legal-modal') as HTMLElement;
    dialog.click();
    expect(closures).toBe(0);
    background.click();
    expect(closures).toBe(1);
  });
});
