import {
  SearchResultDetailResponse,
  SearchResultEvidenceDto,
  SearchResultLinkGroupDto,
  SearchResultLinkItemDto,
  SearchResultSourceGroupDto
} from '../../../core/infrastructure/search-api/search-api.models';
import {
  ProfileDetailViewModel,
  ProfileFieldViewModel,
  ProfileLinkFieldViewModel,
  ProfileLinkGroupViewModel,
  ProfileLinkItemViewModel,
  ProfileLinkKind,
  ProfileLinkSourceViewModel,
  ProfilePhotoViewModel,
  ProfileSourceViewModel
} from './profile-consolidation.models';

const SOURCE_COLORS = [
  '#1C6A54',
  '#163B5C',
  '#7A4D1D',
  '#34495E',
  '#4C187A',
  '#0E405E',
  '#5A1A56',
  '#665A1B'
] as const;

const FIELD_LABELS: Readonly<Record<string, string>> = {
  NOMBRE: 'Nombre',
  NOMBRES: 'Nombre(s)',
  NOMBRECOMPLETO: 'Nombre completo',
  FULLNAME: 'Nombre completo',
  NAME: 'Nombre',
  APELLIDOPATERNO: 'Apellido paterno',
  PRIMERAPELLIDO: 'Apellido paterno',
  LASTNAME: 'Apellido paterno',
  APELLIDOMATERNO: 'Apellido materno',
  SEGUNDOAPELLIDO: 'Apellido materno',
  SECONDLASTNAME: 'Apellido materno',
  ALIAS: 'Alias',
  APODO: 'Alias',
  CURP: 'CURP',
  RFC: 'RFC',
  CUIP: 'CUIP',
  FECHANACIMIENTO: 'Fecha de nacimiento',
  BIRTHDATE: 'Fecha de nacimiento',
  DATEOFBIRTH: 'Fecha de nacimiento',
  SEXO: 'Sexo',
  GENERO: 'Género',
  NACIONALIDAD: 'Nacionalidad',
  ESTADOCIVIL: 'Estado civil',
  DOMICILIO: 'Domicilio',
  DIRECCION: 'Dirección',
  CALLE: 'Calle',
  NUMEROEXTERIOR: 'Número exterior',
  NUMEROINTERIOR: 'Número interior',
  COLONIA: 'Colonia',
  MUNICIPIO: 'Municipio',
  ALCALDIA: 'Alcaldía',
  ENTIDAD: 'Entidad',
  ESTADO: 'Estado',
  CODIGOPOSTAL: 'Código postal',
  TELEFONO: 'Teléfono',
  CELULAR: 'Celular',
  CORREO: 'Correo electrónico',
  EMAIL: 'Correo electrónico',
  NIV: 'NIV',
  VIN: 'NIV',
  PLACA: 'Placa',
  NUMEROMOTOR: 'Número de motor',
  NOMOTOR: 'Número de motor',
  MARCA: 'Marca',
  MODELO: 'Modelo',
  ANIO: 'Año',
  COLOR: 'Color',
  MATRICULA: 'Matrícula',
  SERIE: 'Serie',
  CALIBRE: 'Calibre',
  TIPODEARMA: 'Tipo de arma',
  TIPOARMA: 'Tipo de arma',
  NUMEROLICENCIA: 'Número de licencia',
  LICENCIA: 'Licencia',
  ESTATUS: 'Estatus',
  STATUS: 'Estatus',
  EXPEDIENTE: 'Expediente',
  FOLIO: 'Folio',
  FIRSTNAME: 'Nombre',
  MIDDLENAME: 'Segundo nombre',
  SURNAME: 'Apellido',
  MOTHERSLASTNAME: 'Apellido materno',
  ADDRESS: 'Dirección',
  STREET: 'Calle',
  EXTERIORNUMBER: 'Número exterior',
  INTERIORNUMBER: 'Número interior',
  CITY: 'Municipio',
  COUNTRY: 'País',
  ZIPCODE: 'Código postal',
  POSTALCODE: 'Código postal',
  PHONE: 'Teléfono',
  PHONENUMBER: 'Teléfono',
  MOBILE: 'Celular',
  MOBILENUMBER: 'Celular',
  EMAILADDRESS: 'Correo electrónico',
  LICENSENUMBER: 'Número de licencia',
  WEAPONTYPE: 'Tipo de arma',
  SERIALNUMBER: 'Número de serie',
  REGISTRATIONNUMBER: 'Número de registro',
  MAKE: 'Marca',
  YEAR: 'Año',
  GENDER: 'Sexo',
  NATIONALITY: 'Nacionalidad',
  MARITALSTATUS: 'Estado civil',
  BIRTHPLACE: 'Lugar de nacimiento'
};

const NAME_CODES = ['NOMBRECOMPLETO', 'FULLNAME', 'NAME'];
const FIRST_NAME_CODES = ['NOMBRE', 'NOMBRES'];
const PATERNAL_NAME_CODES = ['APELLIDOPATERNO', 'PRIMERAPELLIDO', 'LASTNAME'];
const MATERNAL_NAME_CODES = ['APELLIDOMATERNO', 'SEGUNDOAPELLIDO', 'SECONDLASTNAME'];
const IDENTIFIER_CODES = ['CURP', 'RFC'];
const BUSINESS_IDENTIFIER_CODES = new Set([
  'CURP',
  'RFC',
  'CUIP',
  'NIV',
  'VIN',
  'PLACA',
  'MATRICULA',
  'SERIE',
  'LICENCIA',
  'FOLIO',
  'EXPEDIENTE'
]);

const TECHNICAL_ID_WORDS = new Set([
  'ID',
  'IDS',
  'UUID',
  'UUIDS',
  'GUID',
  'GUIDS',
  'PK',
  'FK',
  'PRIMARYKEY',
  'FOREIGNKEY',
  'OBJECTID',
  'OBJECTIDS',
  'IDENTIFIER',
  'IDENTIFIERS',
  'IDENTIFICADOR',
  'IDENTIFICADORES'
]);

export function mapSearchResultDetail(
  detail: SearchResultDetailResponse
): ProfileDetailViewModel {
  const sourceGroups = detail.sourceGroups ?? [];
  const sources = sourceGroups
    .map(mapSourceGroup)
    .filter((source) => source.fields.length > 0);
  const evidence = collectEvidence(sourceGroups);
  // Los vínculos del perfil se obtienen exclusivamente de linkGroups.
  // No se infieren desde sourceGroups, contadores de tarjetas ni datos simulados.
  const links = (detail.linkGroups ?? [])
    .map(mapLinkGroup)
    .filter((group) => group.count > 0 || group.items.length > 0);
  const photos = mapPhotos(evidence, sourceGroups);
  const profileName = resolveProfileName(evidence);
  const identifier = findFirstValue(evidence, IDENTIFIER_CODES);
  const entityLabel = humanizeEntityType(detail.entityType || 'Person');
  const status = translateGeneralStatus(detail.status?.trim() || '');
  const subtitleParts = [identifier, entityLabel, status].filter(Boolean);
  const relatedFileCount = sources.reduce(
    (total, source) => total + source.fields.filter((field) => field.isFile).length,
    0
  );
  const additionalObjectCount = links
    .filter((link) => link.kind === 'other')
    .reduce((total, link) => total + link.count, 0);

  return {
    searchId: detail.searchId,
    resultId: detail.resultId,
    entityType: detail.entityType?.trim() || '',
    kind: detail.kind?.trim() || '',
    status,
    hasConflicts: detail.hasConflicts,
    profileName,
    profileSubtitle: subtitleParts.join(' · ') || 'Perfil de persona',
    sources,
    links,
    photos,
    relatedFileCount,
    additionalObjectCount
  };
}

function mapSourceGroup(
  group: SearchResultSourceGroupDto,
  sourceIndex: number
): ProfileSourceViewModel {
  const sourceCode = group.sourceCode?.trim() || '';
  const sourceName = group.sourceName?.trim() || '';
  const title = sourceCode || sourceName || `Fuente ${sourceIndex + 1}`;
  const records = group.records ?? [];
  const fields: ProfileFieldViewModel[] = [];

  records.forEach((record, recordIndex) => {
    const identifiers = record.identifiers ?? [];
    const attributes = record.attributes ?? [];

    identifiers.forEach((item, evidenceIndex) => {
      const field = mapEvidenceField(
        item,
        sourceIndex,
        recordIndex,
        evidenceIndex,
        records.length,
        true
      );
      if (field) {
        fields.push(field);
      }
    });

    attributes.forEach((item, evidenceIndex) => {
      const field = mapEvidenceField(
        item,
        sourceIndex,
        recordIndex,
        evidenceIndex,
        records.length,
        false
      );
      if (field) {
        fields.push(field);
      }
    });
  });

  return {
    id: createSourceId(title, sourceIndex),
    code: createSourceInitials(sourceCode || sourceName || title),
    title,
    description:
      sourceName && sourceName !== title
        ? sourceName
        : `${records.length} ${records.length === 1 ? 'registro encontrado' : 'registros encontrados'}`,
    color: SOURCE_COLORS[sourceIndex % SOURCE_COLORS.length],
    recordCount: records.length,
    fields: deduplicateFields(fields)
  };
}

function mapEvidenceField(
  evidence: SearchResultEvidenceDto,
  sourceIndex: number,
  recordIndex: number,
  evidenceIndex: number,
  recordCount: number,
  isIdentifier: boolean
): ProfileFieldViewModel | null {
  const rawValue = evidence.value?.trim() || '';
  if (!rawValue) {
    return null;
  }

  const rawCode = evidence.code?.trim() || 'dato';
  if (shouldHideField(rawCode, rawValue)) {
    return null;
  }

  const normalizedCode = normalizeCode(rawCode);
  const baseLabel = resolveFieldLabel(rawCode);
  const evidenceId = evidence.evidenceId?.trim();

  return {
    id:
      evidenceId ||
      `${sourceIndex}-${recordIndex}-${isIdentifier ? 'identifier' : 'attribute'}-${evidenceIndex}`,
    code: rawCode,
    label: addRecordSuffix(baseLabel, recordIndex, recordCount),
    value: formatEvidenceValue(normalizedCode, rawValue),
    selected: false,
    isIdentifier,
    isFile: isFileEvidence(normalizedCode, rawValue)
  };
}

function shouldHideField(code: string, value: string): boolean {
  if (isTechnicalIdField(code) || isTechnicalIdValue(value)) {
    return true;
  }

  return isDateLikeField(code) && !isAllowedDateField(code);
}

function isTechnicalIdField(code: string): boolean {
  const leaf = extractLeafFieldName(code);
  const normalizedLeaf = normalizeCode(leaf);

  // CURP, RFC, NIV/VIN y otros identificadores funcionales sí son datos útiles.
  // La regla de ocultamiento se aplica a identificadores técnicos del sistema.
  if (BUSINESS_IDENTIFIER_CODES.has(normalizedLeaf)) {
    return false;
  }

  return extractFieldPathSegments(code).some(isTechnicalIdSegment);
}

function isTechnicalIdSegment(segment: string): boolean {
  const value = segment.replace(/^\$+/, '').trim();
  const normalized = normalizeCode(value);

  if (!value) {
    return false;
  }

  if (TECHNICAL_ID_WORDS.has(normalized)) {
    return true;
  }

  // id_persona, person_id, employee-id, ids_registros, etc.
  if (
    /(?:^|[_-])(?:id|ids|uuid|uuids|guid|guids|pk|fk|identifier|identifiers|identificador|identificadores)(?:$|[_-])/i.test(
      value
    )
  ) {
    return true;
  }

  // idPersona, idEmployee, uuidRegistro, guidSolicitud.
  if (
    /^(?:id|ids|uuid|uuids|guid|guids|identifier|identifiers|identificador|identificadores)(?=[A-Z0-9_-])/i.test(
      value
    )
  ) {
    const upperValue = value.toUpperCase();
    const isRegularWord = /^(IDENTITY|IDENTIDAD|IDIOMA|IDONEIDAD)/.test(
      upperValue
    );

    if (!isRegularWord) {
      return true;
    }
  }

  // personId, employeeID, recordIds, objectGuid, catalogUuid.
  if (
    /(?:Id|ID|Ids|IDs|Uuid|UUID|Uuids|UUIDS|Guid|GUID|Guids|GUIDS|Identifier|Identifiers|Identificador|Identificadores)$/.test(
      value
    )
  ) {
    return true;
  }

  // Variantes completamente en mayúsculas sin separador: IDPERSONA, EMPLOYEEID.
  if (
    /^(?:ID|IDS|UUID|UUIDS|GUID|GUIDS)[A-Z0-9]+$/.test(value) ||
    /^[A-Z0-9]+(?:ID|IDS|UUID|UUIDS|GUID|GUIDS)$/.test(value)
  ) {
    return true;
  }

  return false;
}

function isTechnicalIdValue(value: string): boolean {
  const normalized = value.trim();

  return (
    /^(?:urn:uuid:)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized
    ) ||
    /^(?:ObjectId\()?['"]?[0-9a-f]{24}['"]?\)?$/i.test(normalized)
  );
}

function extractFieldPathSegments(value: string): string[] {
  const bracketNormalized = value.replace(
    /\[(?:'|")?([^'"\]]+)(?:'|")?\]/g,
    '.$1'
  );

  return bracketNormalized
    .split(/[./\\:]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isDateLikeField(code: string): boolean {
  const normalized = normalizeCode(code);
  return /(FECHA|DATE|DATETIME|TIMESTAMP|CREATEDAT|UPDATEDAT|MODIFIEDAT)/.test(
    normalized
  );
}

function isAllowedDateField(code: string): boolean {
  const normalized = normalizeCode(code);

  if (/(FECHANACIMIENTO|NACIMIENTOFECHA|BIRTHDATE|DATEOFBIRTH)/.test(normalized)) {
    return true;
  }

  const isUpdateDate = /(ACTUALIZACION|ACTUALIZADO|UPDATE|UPDATED|MODIFICACION|MODIFIED)/.test(
    normalized
  );

  if (!isUpdateDate) {
    return false;
  }

  const isAssignment = /(ADSCRIPCION|ASSIGNMENT)/.test(normalized);
  const isPerson = /(^|.*)(PERSONA|PERSON)(.*|$)/.test(normalized);

  return isAssignment || isPerson;
}

function collectEvidence(
  groups: SearchResultSourceGroupDto[]
): SearchResultEvidenceDto[] {
  return groups.flatMap((group) =>
    (group.records ?? []).flatMap((record) => [
      ...(record.identifiers ?? []),
      ...(record.attributes ?? [])
    ])
  );
}

function mapLinkGroup(
  group: SearchResultLinkGroupDto,
  index: number
): ProfileLinkGroupViewModel {
  const entityType = group.entityType?.trim() || 'Relacionado';
  const kind = resolveLinkKind(entityType);
  const items = (group.items ?? [])
    .map((item, itemIndex) => mapLinkItem(item, index, itemIndex))
    .filter((item) => item.fields.length > 0 || item.sources.length > 0);

  // El número mostrado en el chip sale de linkGroups[].count.
  // Solo se usa items.length como respaldo si el contrato no trae un conteo válido.
  const declaredCount =
    Number.isFinite(group.count) && group.count >= 0 ? group.count : items.length;
  const count = declaredCount > 0 ? declaredCount : items.length;

  return {
    id: `${normalizeCode(entityType).toLowerCase() || 'related'}-${index}`,
    entityType,
    label: resolveLinkLabel(entityType, count),
    count,
    kind,
    items
  };
}

function mapLinkItem(
  item: SearchResultLinkItemDto,
  groupIndex: number,
  itemIndex: number
): ProfileLinkItemViewModel {
  const fields: ProfileLinkFieldViewModel[] = [];
  const evidence = [
    ...(item.identifiers ?? []),
    ...(item.attributes ?? [])
  ];

  evidence.forEach((entry, evidenceIndex) => {
    const rawCode = entry.code?.trim() || 'dato';
    const rawValue = entry.value?.trim() || '';

    if (!rawValue || shouldHideField(rawCode, rawValue)) {
      return;
    }

    fields.push({
      id: `link-${groupIndex}-${itemIndex}-field-${evidenceIndex}`,
      label: resolveFieldLabel(rawCode),
      value: formatEvidenceValue(normalizeCode(rawCode), rawValue)
    });
  });

  const status = item.status?.trim();
  if (status) {
    fields.push({
      id: `link-${groupIndex}-${itemIndex}-status`,
      label: 'Estatus',
      value: translateLinkStatus(status)
    });
  }

  const relationship = item.relationshipCode?.trim();
  if (relationship && !isTechnicalIdValue(relationship)) {
    fields.push({
      id: `link-${groupIndex}-${itemIndex}-relationship`,
      label: 'Relación',
      value: translateRelationship(relationship)
    });
  }

  return {
    id: `link-${groupIndex}-${itemIndex}`,
    fields: deduplicateLinkFields(fields),
    sources: mapLinkSources(item, groupIndex, itemIndex)
  };
}

function mapLinkSources(
  item: SearchResultLinkItemDto,
  groupIndex: number,
  itemIndex: number
): ProfileLinkSourceViewModel[] {
  const seen = new Set<string>();
  const evidence = [
    ...(item.identifiers ?? []),
    ...(item.attributes ?? [])
  ];

  // El backend puede colocar el origen en linkGroups[].items[].origins
  // o dentro de identifiers/attributes[].origins. Se leen ambas ubicaciones.
  const origins = [
    ...(item.origins ?? []),
    ...evidence.flatMap((entry) => entry.origins ?? [])
  ];

  return origins.flatMap((origin, originIndex) => {
    const label = origin.sourceCode?.trim() || origin.sourceName?.trim() || '';
    const normalized = normalizeCode(label);

    if (!label || seen.has(normalized)) {
      return [];
    }

    seen.add(normalized);
    return [{
      id: `link-${groupIndex}-${itemIndex}-source-${originIndex}`,
      label,
      color: colorForLabel(label)
    }];
  });
}

function deduplicateLinkFields(
  fields: ProfileLinkFieldViewModel[]
): ProfileLinkFieldViewModel[] {
  const seen = new Set<string>();

  return fields.filter((field) => {
    const key = `${normalizeCode(field.label)}|${field.value}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function colorForLabel(label: string): string {
  const normalized = normalizeCode(label);
  let hash = 0;

  for (const character of normalized) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return SOURCE_COLORS[hash % SOURCE_COLORS.length];
}

function mapPhotos(
  evidence: SearchResultEvidenceDto[],
  groups: SearchResultSourceGroupDto[]
): ProfilePhotoViewModel[] {
  const sourceByEvidenceId = new Map<string, string>();

  groups.forEach((group) => {
    const sourceTitle = group.sourceCode?.trim() || group.sourceName?.trim() || 'Fuente';
    (group.records ?? []).forEach((record) => {
      [...(record.identifiers ?? []), ...(record.attributes ?? [])].forEach((item) => {
        if (item.evidenceId) {
          sourceByEvidenceId.set(item.evidenceId, sourceTitle);
        }
      });
    });
  });

  return evidence
    .filter((item) => {
      const code = normalizeCode(item.code || '');
      const value = item.value?.trim() || '';
      return isPhotoCode(code) && isRenderableImage(value);
    })
    .map((item, index) => ({
      id: item.evidenceId || `photo-${index}`,
      src: item.value!.trim(),
      alt: resolveFieldLabel(item.code || 'Fotografía'),
      sourceTitle: sourceByEvidenceId.get(item.evidenceId) || 'Fuente'
    }));
}

function resolveProfileName(evidence: SearchResultEvidenceDto[]): string {
  const completeName = findFirstValue(evidence, NAME_CODES);
  if (completeName) {
    return completeName;
  }

  const parts = [
    findFirstValue(evidence, FIRST_NAME_CODES),
    findFirstValue(evidence, PATERNAL_NAME_CODES),
    findFirstValue(evidence, MATERNAL_NAME_CODES)
  ].filter(Boolean);

  return parts.join(' ') || 'Perfil sin nombre disponible';
}

function findFirstValue(
  evidence: SearchResultEvidenceDto[],
  codes: string[]
): string {
  const allowedCodes = new Set(codes);
  const match = evidence.find(
    (item) =>
      allowedCodes.has(normalizeCode(extractLeafFieldName(item.code || ''))) &&
      Boolean(item.value?.trim())
  );
  return match?.value?.trim() || '';
}

function resolveFieldLabel(code: string): string {
  const normalizedPath = normalizeCode(code);

  if (/(FECHANACIMIENTO|NACIMIENTOFECHA|BIRTHDATE|DATEOFBIRTH)/.test(normalizedPath)) {
    return 'Fecha de nacimiento';
  }

  if (
    /(ADSCRIPCION|ASSIGNMENT)/.test(normalizedPath) &&
    /(ACTUALIZACION|ACTUALIZADO|UPDATE|UPDATED|MODIFICACION|MODIFIED)/.test(
      normalizedPath
    )
  ) {
    return 'Fecha actualización adscripción';
  }

  if (
    /(PERSONA|PERSON)/.test(normalizedPath) &&
    /(ACTUALIZACION|ACTUALIZADO|UPDATE|UPDATED|MODIFICACION|MODIFIED)/.test(
      normalizedPath
    )
  ) {
    return 'Fecha actualización persona';
  }

  const leaf = extractLeafFieldName(code);
  const normalizedLeaf = normalizeCode(leaf);
  return FIELD_LABELS[normalizedLeaf] || humanizeCode(leaf);
}

function extractLeafFieldName(value: string): string {
  const bracketNormalized = value.replace(
    /\[(?:'|")?([^'"\]]+)(?:'|")?\]/g,
    '.$1'
  );
  const parts = bracketNormalized
    .split(/[./\\:]+/)
    .map((part) => part.replace(/^\$+/, '').trim())
    .filter(Boolean);

  return parts.at(-1) || value.trim() || 'dato';
}

function normalizeCode(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/_/g, '')
    .toUpperCase();
}

function humanizeCode(value: string): string {
  const normalized = value
    .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return 'Dato';
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

function humanizeEntityType(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'person' || normalized === 'persona') {
    return 'Perfil de persona';
  }
  if (normalized === 'vehicle' || normalized === 'vehiculo') {
    return 'Perfil de vehículo';
  }
  if (
    normalized === 'weapon' ||
    normalized === 'firearm' ||
    normalized === 'arma'
  ) {
    return 'Perfil de arma';
  }
  return humanizeCode(value);
}

function formatEvidenceValue(code: string, value: string): string {
  if (!isDateLikeField(code)) {
    return value;
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);
  if (!dateOnlyMatch) {
    return value;
  }

  const [, year, month, day] = dateOnlyMatch;
  return `${day}/${month}/${year}`;
}

function isFileEvidence(code: string, value: string): boolean {
  if (/(ARCHIVO|DOCUMENTO|ADJUNTO|FILE|PDF|DOCURL|URLDOCUMENTO)/.test(code)) {
    return true;
  }
  return /\.(pdf|docx?|xlsx?|jpe?g|png)(?:\?.*)?$/i.test(value);
}

function isPhotoCode(code: string): boolean {
  return /(FOTO|FOTOGRAFIA|IMAGEN|PHOTO|IMAGE)/.test(code);
}

function isRenderableImage(value: string): boolean {
  return (
    /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value) ||
    /^https?:\/\/\S+\.(png|jpe?g|webp|gif)(?:\?.*)?$/i.test(value) ||
    /^\/\S+\.(png|jpe?g|webp|gif)(?:\?.*)?$/i.test(value)
  );
}

function translateLinkStatus(value: string): string {
  const normalized = normalizeCode(value);

  switch (normalized) {
    case 'INDEPENDENT':
      return 'Independiente';
    case 'ACTIVE':
      return 'Activo';
    case 'INACTIVE':
      return 'Inactivo';
    case 'COMPLETED':
    case 'COMPLETE':
      return 'Completado';
    case 'PENDING':
      return 'Pendiente';
    case 'FAILED':
      return 'Fallido';
    case 'CANCELLED':
    case 'CANCELED':
      return 'Cancelado';
    default:
      return humanizeCode(value);
  }
}


function translateGeneralStatus(value: string): string {
  const normalized = normalizeCode(value);

  switch (normalized) {
    case 'COMPLETED':
    case 'COMPLETE':
    case 'SUCCESS':
    case 'SUCCEEDED':
      return 'Completado';
    case 'ENRICHED':
      return 'Enriquecido';
    case 'PROCESSING':
    case 'INPROGRESS':
    case 'RUNNING':
      return 'En proceso';
    case 'PENDING':
    case 'QUEUED':
      return 'Pendiente';
    case 'PARTIAL':
      return 'Parcial';
    case 'FAILED':
    case 'ERROR':
      return 'Fallido';
    case 'CANCELLED':
    case 'CANCELED':
      return 'Cancelado';
    case 'ACTIVE':
      return 'Activo';
    case 'INACTIVE':
      return 'Inactivo';
    default:
      return humanizeCode(value);
  }
}

function translateRelationship(value: string): string {
  const normalized = normalizeCode(value);

  switch (normalized) {
    case 'OWNER':
      return 'Propietario';
    case 'DRIVER':
      return 'Conductor';
    case 'PASSENGER':
      return 'Pasajero';
    case 'HOLDER':
    case 'BEARER':
    case 'CARRIER':
    case 'PORTADOR':
      return 'Portador';
    case 'SPOUSE':
      return 'Cónyuge';
    case 'RELATIVE':
      return 'Familiar';
    case 'RELATED':
      return 'Relacionado';
    default:
      return humanizeCode(value);
  }
}

function resolveLinkKind(entityType: string): ProfileLinkKind {
  const normalized = normalizeCode(entityType);
  if (/(VEHICLE|VEHICULO|VEHICULOS|AUTO|AUTOMOVIL)/.test(normalized)) {
    return 'vehicle';
  }
  if (/(WEAPON|FIREARM|ARMA|ARMAS)/.test(normalized)) {
    return 'weapon';
  }
  if (/(PERSON|PERSONA|PERSONAS)/.test(normalized)) {
    return 'person';
  }
  return 'other';
}

function resolveLinkLabel(entityType: string, count: number): string {
  const kind = resolveLinkKind(entityType);
  const singular = count === 1;

  switch (kind) {
    case 'vehicle':
      return singular ? 'Vehículo' : 'Vehículos';
    case 'weapon':
      return singular ? 'Arma' : 'Armas';
    case 'person':
      return singular ? 'Persona' : 'Personas';
    default:
      return humanizeCode(entityType);
  }
}

function createSourceInitials(value: string): string {
  const compact = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return compact.slice(0, 2) || 'FU';
}

function createSourceId(value: string, index: number): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'source'}-${index}`;
}

function addRecordSuffix(
  label: string,
  recordIndex: number,
  recordCount: number
): string {
  return recordCount > 1 ? `${label} · Registro ${recordIndex + 1}` : label;
}

function deduplicateFields(
  fields: ProfileFieldViewModel[]
): ProfileFieldViewModel[] {
  const seen = new Set<string>();

  return fields.filter((field) => {
    const key = `${field.code}|${field.label}|${field.value}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
