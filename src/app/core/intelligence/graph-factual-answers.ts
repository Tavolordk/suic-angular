import type { SearchResultDetailResponse, SearchResultLinkItemDto } from '../infrastructure/search-api/search-api.models';
import type { IntelligenceChatHistoryMessage } from './intelligence-api.models';
import type { IntelligenceAnswer, IntelligenceEvidence } from './profile-intelligence.models';

type Kind = 'person' | 'vehicle' | 'weapon';
interface RelationshipRecord { kind: Kind; item: SearchResultLinkItemDto; }

const normalize = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const codeKey = (value: string | null | undefined): string => normalize(value ?? '').replace(/[^a-z0-9]/g, '');

function relationKind(value: string | null | undefined): Kind | null {
  const type = normalize(value ?? '');
  if (type.includes('person')) return 'person';
  if (type.includes('vehicle') || type.includes('vehicul')) return 'vehicle';
  if (type.includes('weapon') || type.includes('arma')) return 'weapon';
  return null;
}

function entries(detail: SearchResultDetailResponse): RelationshipRecord[] {
  return (detail.linkGroups ?? []).flatMap((group) => {
    const kind = relationKind(group.entityType);
    return kind ? (group.items ?? []).map((item) => ({ kind, item })) : [];
  });
}

function dataValue(item: SearchResultLinkItemDto, ...codes: string[]): string {
  const keys = new Set(codes.map(codeKey));
  const field = [...(item.identifiers ?? []), ...(item.attributes ?? [])]
    .find((entry) => keys.has(codeKey(entry.code)) && entry.value?.trim());
  return field?.value?.trim() ?? '';
}

function sourceCodes(item: SearchResultLinkItemDto): string[] {
  return [...new Set((item.origins ?? []).map((origin) => origin.sourceCode?.trim()).filter((source): source is string => Boolean(source)))];
}

function relationLabel(item: SearchResultLinkItemDto): string {
  return item.relationshipCode?.trim()?.replace(/[-_]+/g, ' ') || 'No especificada';
}

function displayName(item: SearchResultLinkItemDto): string {
  return [dataValue(item, 'nombre', 'nombres'), dataValue(item, 'apellidoPaterno'), dataValue(item, 'apellidoMaterno')]
    .filter(Boolean).join(' ') || 'Persona sin nombre en el detalle';
}

function vehicleName(item: SearchResultLinkItemDto): string {
  return [dataValue(item, 'marca'), dataValue(item, 'submarca')].filter(Boolean).join(' ') || 'Vehículo sin marca reportada';
}

function vehicleVin(item: SearchResultLinkItemDto): string { return dataValue(item, 'VIN', 'NIV'); }
function vehiclePlate(item: SearchResultLinkItemDto): string {
  return dataValue(item, 'PLACA', 'PLACAS', 'PLATE', 'PLATENUMBER', 'LICENSEPLATE') ||
    item.placa?.trim() || item.plate?.trim() || item.licensePlate?.trim() || item.plateNumber?.trim() || '';
}

function evidenceFor(record: RelationshipRecord, index: number): IntelligenceEvidence {
  const { item, kind } = record;
  const label = kind === 'person' ? displayName(item) : kind === 'vehicle' ? vehicleName(item) : 'Arma vinculada';
  const identity = kind === 'vehicle'
    ? [vehicleVin(item) && `VIN: ${vehicleVin(item)}`, vehiclePlate(item) && `Placa: ${vehiclePlate(item)}`].filter(Boolean).join(' · ')
    : kind === 'person' ? displayName(item) : dataValue(item, 'SERIE', 'MATRICULA');
  const trace = [...new Set((item.origins ?? []).filter((origin) => origin.sourceRecordId)
    .map((origin) => `${origin.sourceCode || 'Fuente'}: ${origin.sourceRecordId}`))].join(', ');
  return {
    kind: 'relation', id: item.linkId || `vinculo-${index}`,
    label: `${label} — ${relationLabel(item)}`,
    value: [identity || 'Vínculo registrado sin identificador adicional', trace && `Registros de origen: ${trace}`].filter(Boolean).join(' · '),
    sourceCodes: sourceCodes(item)
  };
}

/** Respuestas completas y trazables para preguntas que no requieren generación de un LLM. */
export function answerGraphFacts(
  question: string,
  detail: SearchResultDetailResponse,
  history: IntelligenceChatHistoryMessage[] = []
): IntelligenceAnswer | null {
  const q = normalize(question.trim());
  if (!q) return null;
  const all = entries(detail);
  const persons = all.filter((entry) => entry.kind === 'person');
  const vehicles = all.filter((entry) => entry.kind === 'vehicle');
  const weapons = all.filter((entry) => entry.kind === 'weapon');
  const totalVehiclesReported = (detail.linkGroups ?? [])
    .filter((group) => relationKind(group.entityType) === 'vehicle')
    .reduce((total, group) => total + Math.max(0, Number(group.count ?? group.items?.length ?? 0)), 0);

  const isInvestigation = /\b(investigar|investigaria|investigarias|investigariamos|priorizar|priorizarias|revisar despues|explorar despues|siguientes pasos|cuales .*investig)/.test(q)
    && /relacion|vinculo|grafo|conexion/.test(q);
  if (isInvestigation) {
    const specific = persons.filter(({ item }) => !['PERSONA', ''].includes(item.relationshipCode?.trim().toUpperCase() ?? ''));
    const complaints = vehicles.filter(({ item }) => /DENUNCIANTE|ROBO|RECUPERAD/.test(item.relationshipCode?.toUpperCase() ?? ''));
    const multipleSources = vehicles.filter(({ item }) => (item.origins ?? []).length > 1);
    const actions: string[] = [];
    if (specific.length) {
      actions.push(`1. Contrastar los ${specific.length} vínculos personales que tienen una relación explícita: ${specific.map(({ item }) => `${displayName(item)} (${relationLabel(item)})`).join('; ')}. Verifica en los registros de origen qué significa cada código y su vigencia.`);
    }
    if (complaints.length) {
      actions.push(`${actions.length + 1}. Revisar el vínculo vehicular asociado a denuncia: ${complaints.map(({ item }) => `${vehicleName(item)}${vehicleVin(item) ? `, VIN ${vehicleVin(item)}` : ''} (${relationLabel(item)})`).join('; ')}. Consulta el registro VRYR para precisar el papel de la persona y el contexto de la denuncia.`);
    }
    if (multipleSources.length) {
      actions.push(`${actions.length + 1}. Contrastar ${multipleSources.length === 1 ? 'el vínculo vehicular' : `los ${multipleSources.length} vínculos vehiculares`} que ${multipleSources.length === 1 ? 'reúne' : 'reúnen'} varios registros de origen (REPUVE), cotejando VIN y fechas para evitar contar varias veces el mismo vehículo.`);
    }
    if (!actions.length) {
      actions.push('1. Contrastar los códigos de relación y sus registros de origen antes de inferir el tipo de vínculo.');
    }
    actions.push(`${actions.length + 1}. Comparar los datos de las fuentes disponibles con el perfil consolidado y documentar cualquier diferencia verificable.`);
    return {
      text: `Prioridades sugeridas a partir de los ${all.length} vínculos recibidos (${persons.length} personas, ${vehicles.length} vehículos y ${weapons.length} armas):\n\n${actions.join('\n\n')}\n\nEstas son verificaciones propuestas, no indicios de responsabilidad ni conclusiones sobre las personas vinculadas.`,
      evidence: [...specific, ...complaints, ...multipleSources].filter((entry, index, array) => array.findIndex((other) => other.item.linkId === entry.item.linkId) === index).map(evidenceFor)
    };
  }

  const previousVehicleQuestion = [...history].reverse().some((entry) =>
    entry.role === 'user' && /vehicul|autos|carros|coches/.test(normalize(entry.content))
  );
  const refersToOmitted = /\b(ultimos|restantes|faltantes|omitidos|no muestras|no listados|faltan|omitiste|siguientes)\b/.test(q);
  const vehicleRequest = /\b(vehicul\w*|autos|carros|coches|automoviles|vin|niv)\b/.test(q)
    || (previousVehicleQuestion && (refersToOmitted || /\b(?:primeros|del|de los|otros|resto)\b/.test(q)));
  const listingRequest = /\b(dame|muestra|muestrame|lista|listame|enumera|todos|todas|ultimos|primeros|restantes|faltantes|faltan|omitiste|siguientes|omitidos|cuantos|cuantas|cuales|que|detalle|resumen|informacion|registros|del|de\s+los)\b/.test(q);

  if (vehicleRequest && listingRequest) {
    if (!vehicles.length) return { text: 'El detalle de búsqueda no devuelve vínculos de vehículos.', evidence: [] };
    const range = q.match(/\b(?:del|de)\s+(\d+)\s+(?:al|a|hasta)\s+(\d+)\b/);
    const lastMatch = q.match(/\b(?:ultimos|restantes|faltantes)\s+(\d+)\b/) || q.match(/\b(\d+)\s+(?:ultimos|restantes|faltantes)\b/);
    const firstMatch = q.match(/\bprimeros?\s+(\d+)\b/);
    const requested = range ? vehicles.slice(Math.max(0, Number(range[1]) - 1), Number(range[2]))
      : lastMatch ? vehicles.slice(-Number(lastMatch[1]))
      : firstMatch ? vehicles.slice(0, Number(firstMatch[1]))
      : refersToOmitted && previousVehicleQuestion && /ultimos|restantes|faltantes|faltan|omitidos|omitiste|no muestras|no listados|siguientes/.test(q)
        ? vehicles.slice(12) // Compatibilidad con la respuesta anterior que se detenía en 12.
        : vehicles;
    const start = requested.length ? vehicles.indexOf(requested[0]) + 1 : 0;
    if (!requested.length) return { text: 'No hay registros en el rango solicitado.', evidence: [] };
    const lines = requested.map(({ item }, index) => {
      const details = [
        dataValue(item, 'anioModelo') && `Año: ${dataValue(item, 'anioModelo')}`,
        dataValue(item, 'modelo') && `Modelo: ${dataValue(item, 'modelo')}`,
        dataValue(item, 'color') && `Color: ${dataValue(item, 'color')}`,
        vehicleVin(item) && `VIN: ${vehicleVin(item)}`,
        vehiclePlate(item) && `Placa: ${vehiclePlate(item)}`,
        `Relación registrada: ${relationLabel(item)}`,
        `Fuente: ${sourceCodes(item).join(', ') || 'No especificada'}`
      ].filter(Boolean).join(' · ');
      return `${start + index}. ${vehicleName(item)} — ${details}`;
    });
    const hasCompleteCatalog = vehicles.length >= totalVehiclesReported;
    const title = requested.length === vehicles.length
      ? hasCompleteCatalog
        ? `Estos son los ${vehicles.length} vehículos del detalle de búsqueda, sin omitir registros:`
        : `El servicio reporta ${totalVehiclesReported} vehículos, pero solo entregó ${vehicles.length} elementos. Estos son todos los registros recibidos:`
      : `Estos son los vehículos del ${start} al ${start + requested.length - 1} de ${vehicles.length} recibidos${hasCompleteCatalog ? '' : ` (el servicio reporta ${totalVehiclesReported})`}:`;
    return {
      text: `${title}\n\n${lines.join('\n\n')}\n\nLos códigos de relación indican cómo aparecen vinculados en la fuente; no acreditan por sí solos propiedad actual ni responsabilidad.`,
      evidence: requested.map(evidenceFor),
      disclaimer: `Datos extraídos de linkGroups del detalle de búsqueda. ${hasCompleteCatalog ? 'El número recibido coincide con el total reportado.' : 'La respuesta del servicio es parcial: se requiere obtener el resto desde el backend.'}`
    };
  }

  const personQuestion = /\b(persona\w*|gente|individuos)\b/.test(q) && /vincul|relacion|conexion|asociad|quienes|cuales|lista|muestra|dame|grafo/.test(q);
  const relationOverview = /\b(relaciones|vinculos|conexiones)\b/.test(q) && /\b(cuales|que|cuantos|lista|describe|muestra|hay|aparecen|tiene)\b/.test(q);
  if (personQuestion || relationOverview) {
    const personLines = persons.map(({ item }, index) => `${index + 1}. ${displayName(item)} — Relación registrada: ${relationLabel(item)} · Fuente: ${sourceCodes(item).join(', ') || 'No especificada'}`);
    const personText = persons.length ? personLines.join('\n') : 'No aparecen personas vinculadas en el detalle.';
    const extra = relationOverview && !personQuestion
      ? `\n\nOtros vínculos: ${vehicles.length} vehículos y ${weapons.length} armas. Los tipos vehiculares registrados son ${[...new Set(vehicles.map(({ item }) => relationLabel(item)))].join(', ') || 'no especificados'}.`
      : '';
    return {
      text: `En el detalle de búsqueda aparecen ${persons.length} personas vinculadas:\n\n${personText}${extra}\n\n«PERSONA» es un código genérico: no establece parentesco ni otra relación específica.`,
      evidence: persons.map(evidenceFor),
      disclaimer: 'Se reproducen los códigos de relación de las fuentes sin inferir vínculos adicionales.'
    };
  }
  return null;
}

/** El modelo sólo recibe campos relevantes, nunca identificadores técnicos de rastreo. */
export function compactGraphFacts(detail: SearchResultDetailResponse): Array<{
  id: string; type: string; title: string; subtitle: string; details: Array<{ label: string; value: string }>;
}> {
  return entries(detail).slice(0, 120).map(({ item, kind }) => {
    const fields = kind === 'vehicle'
      ? [['VIN', vehicleVin(item)], ['Placa', vehiclePlate(item)], ['Año', dataValue(item, 'anioModelo')], ['Modelo', dataValue(item, 'modelo')], ['Color', dataValue(item, 'color')]]
      : kind === 'person' ? [['Nombre', displayName(item)]]
      : [['Serie', dataValue(item, 'serie', 'matricula')]];
    return {
      id: item.linkId,
      type: kind === 'person' ? 'Persona' : kind === 'vehicle' ? 'Vehículo' : 'Arma',
      title: kind === 'person' ? displayName(item) : kind === 'vehicle' ? vehicleName(item) : 'Arma vinculada',
      subtitle: `Relación: ${relationLabel(item)}`,
      details: [...fields.filter(([, value]) => Boolean(value)).map(([label, value]) => ({ label, value })),
        { label: 'Fuentes', value: sourceCodes(item).join(', ') || 'No especificadas' }]
    };
  });
}
