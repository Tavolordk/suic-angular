import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchFilter } from '../../../../core/domain/entities/search-filter';

@Component({
  selector: 'app-search-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search-form.html',
  styleUrl: './search-form.scss'
})
export class SearchForm {
  @Output() readonly searchSubmitted = new EventEmitter<SearchFilter>();
  @Output() readonly cleared = new EventEmitter<void>();

  readonly filter = signal<SearchFilter>({
    query: '',
    curp: '',
    name: '',
    firstLastName: '',
    secondLastName: '',
    birthDate: '',
    gender: '',
    entity: '',
    municipality: ''
  });

  updateField<K extends keyof SearchFilter>(field: K, value: SearchFilter[K]): void {
    this.filter.update(current => ({
      ...current,
      [field]: value
    }));
  }

  submit(): void {
    this.searchSubmitted.emit(this.filter());
  }

  clear(): void {
    this.filter.set({
      query: '',
      curp: '',
      name: '',
      firstLastName: '',
      secondLastName: '',
      birthDate: '',
      gender: '',
      entity: '',
      municipality: ''
    });

    this.cleared.emit();
  }
}