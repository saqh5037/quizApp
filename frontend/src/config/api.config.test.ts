// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { apiConfig, buildApiUrl } from './api.config';

const setLocation = (href: string) => {
  Object.defineProperty(window, 'location', {
    value: new URL(href),
    writable: true,
    configurable: true,
  });
};

describe('api.config origin derivation', () => {
  afterEach(() => {
    setLocation('http://localhost:5173/');
  });

  it('derives same-origin HTTPS API and socket URLs on the QA sslip.io hostname', () => {
    setLocation('https://aristotest.52-55-189-120.sslip.io/quiz/43/public');

    expect(apiConfig.baseURL).toBe('https://aristotest.52-55-189-120.sslip.io/api/v1');
    expect(apiConfig.apiURL).toBe('https://aristotest.52-55-189-120.sslip.io');
    expect(apiConfig.socketURL).toBe('https://aristotest.52-55-189-120.sslip.io');
    expect(buildApiUrl('/quizzes/43/public')).toBe(
      'https://aristotest.52-55-189-120.sslip.io/api/v1/quizzes/43/public'
    );
  });

  it('derives same-origin HTTP API URL on the legacy ec2 hostname', () => {
    setLocation('http://ec2-52-55-189-120.compute-1.amazonaws.com/');

    expect(apiConfig.baseURL).toBe('http://ec2-52-55-189-120.compute-1.amazonaws.com/api/v1');
  });

  it('keeps the local dev backend port when accessed from localhost', () => {
    setLocation('http://localhost:5173/');

    expect(apiConfig.baseURL).toBe('http://localhost:3001/api/v1');
  });
});
