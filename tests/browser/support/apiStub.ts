import { vi } from 'vitest';

export interface StubbedApiRequest {
  url: URL;
  method: string;
  body: unknown;
}

type ApiStubHandler = (request: StubbedApiRequest) => Response | Promise<Response>;

export const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
};

export const apiSuccess = <T,>(data: T, status = 200) => new Response(JSON.stringify({
  httpStatus: status,
  message: 'OK',
  data,
}), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

export const apiFailure = (status: number, code: string, message: string) => new Response(JSON.stringify({
  httpStatus: status,
  message,
  data: { code },
}), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

export const installApiStub = (handler: ApiStubHandler) => {
  const requests: StubbedApiRequest[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = input instanceof Request ? input.url : input.toString();
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const bodyText = typeof init?.body === 'string' ? init.body : null;
    const request = {
      url: new URL(rawUrl, window.location.origin),
      method,
      body: bodyText ? JSON.parse(bodyText) as unknown : null,
    };
    requests.push(request);
    return handler(request);
  });

  vi.stubGlobal('fetch', fetchMock);
  return { requests, fetchMock };
};
