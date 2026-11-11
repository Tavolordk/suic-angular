import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SEARCH_API_BASE_URL } from './search-api.config';
import { PersonReportApiService } from './person-report-api.service';

describe('PersonReportApiService - REP-02/03/04', () => {
  let api: PersonReportApiService;
  let http: HttpTestingController;
  const searchId = '11111111-1111-4111-8111-111111111111';
  const jobId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: SEARCH_API_BASE_URL, useValue: '/api' }
    ] });
    api = TestBed.inject(PersonReportApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('REP-02 usa POST sin body, sin tarjetas y conserva reportJobId', () => {
    let received = '';
    api.requestReport(searchId).subscribe(r => received = r.reportJobId);
    const req = http.expectOne(`/api/search/${searchId}/reports/general`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    expect(req.request.headers.get('Accept')).toBe('application/json');
    req.flush({ success: true, data: { reportJobId: jobId, datasetId: 'dataset', reused: true } },
      { status: 202, statusText: 'Accepted' });
    expect(received).toBe(jobId);
  });

  it('REP-03 consulta sólo por reportJobId y lee Completed + file.available', () => {
    let ready = false;
    api.getStatus(jobId).subscribe(r => ready = r.status === 'Completed' && !!r.file?.available);
    const req = http.expectOne(`/api/reports/${jobId}`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ success: true, data: { reportJobId: jobId, searchId, status: 'Completed',
      file: { available: true, fileName: 'reporte.pdf' } } });
    expect(ready).toBeTrue();
  });

  it('REP-04 solicita Blob con Accept PDF, sin deserializar JSON', () => {
    let contentType = '';
    api.downloadReport(jobId).subscribe(r => contentType = r.headers.get('Content-Type') || '');
    const req = http.expectOne(`/api/reports/${jobId}/file`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.headers.get('Accept')).toBe('application/pdf');
    req.flush(new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
      { headers: { 'Content-Type': 'application/pdf' } });
    expect(contentType).toBe('application/pdf');
  });

  it('no presenta un success=false como reporte válido', () => {
    let message = '';
    api.requestReport(searchId).subscribe({ error: (e: Error) => message = e.message });
    http.expectOne(`/api/search/${searchId}/reports/general`)
      .flush({ success: false, data: null, errors: [{ code: 'SEARCH_EXPIRED', message: 'Expirada' }] });
    expect(message).toBe('Expirada');
  });
});
