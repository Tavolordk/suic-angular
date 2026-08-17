import { Observable } from 'rxjs';
import { CaptchaChallenge, CaptchaGenerationOptions } from './captcha.model';

export abstract class CaptchaRepository {
    abstract generate(options?: CaptchaGenerationOptions): Observable<CaptchaChallenge>;
}
