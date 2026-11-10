import { SearchHistoryInputDto, SearchHistoryItemDto } from '../../../core/infrastructure/search-api/search-api.models';

const historyEntityLabels: Record<string, string> = { person: 'Persona', vehicle: 'Vehículo', weapon: 'Arma' };
const historyFieldLabels: Record<string, string> = {
  nombre: 'Nombre', nombres: 'Nombre', apellidopaterno: 'A. paterno',
  apellidomaterno: 'A. materno', curp: 'CURP', rfc: 'RFC',
  vin: 'NIV', niv: 'NIV', placa: 'Placa', matricula: 'Matrícula'
};

export function historyEntityLabel(entityType: string): string {
  return historyEntityLabels[entityType.trim().toLowerCase()] ?? entityType;
}

export function historyInputsLabel(inputs: SearchHistoryInputDto[]): string {
  const valid = (inputs ?? []).filter(input => input?.value?.trim());
  return valid.slice(0, 2).map(input => {
    const key = input.code?.trim() ?? '';
    return `${historyFieldLabels[key.toLowerCase()] ?? key}: ${input.value.trim()}`;
  }).join(' · ') || 'Sin criterios visibles';
}

export function historyTitle(item: SearchHistoryItemDto): string {
  const values = (item.inputs ?? []).filter(input => input?.value?.trim()).slice(0, 2)
    .map(input => input.value.trim());
  return values.join(' · ') || historyEntityLabel(item.entityType);
}

export function historyIsExpired(item: SearchHistoryItemDto, now = Date.now()): boolean {
  const expiresAt = Date.parse(item.expiresAtUtc);
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

export function historyDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value :
    parsed.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}
