import type { APIRequestContext, APIResponse } from '@playwright/test';

export const APP_ORIGIN = 'https://minerva-mentorship.pages.dev';
export const SESSION_COOKIE_NAME = 'minerva_session';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  tokenBalance: number;
  profileCompleted: boolean;
}

export interface TestAccount {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  remember?: boolean;
}

export type TokenPackId = 'starter' | 'momentum' | 'focus';

export interface PricingPack {
  id: string;
  name: string;
  tokens: number;
  price: string;
  description: string;
  badge: string;
}

export interface TopUpResult {
  demo: boolean;
  creditedTokens: number;
  tokenBalance: number;
  transactionId: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
}

export interface SavedProfile {
  gpa?: number | null;
  name?: string;
  [key: string]: unknown;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
  requestId?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | undefined;

  constructor(
    message: string,
    status: number,
    code: string,
    details?: unknown,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  static async from(response: APIResponse): Promise<ApiError> {
    const status = response.status();
    const fallbackCode = status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED';
    try {
      const body = (await response.json()) as ApiErrorBody;
      return new ApiError(
        body.error?.message ?? `Request failed with status ${status}`,
        status,
        body.error?.code ?? fallbackCode,
        body.error?.details,
        body.requestId
      );
    } catch {
      return new ApiError(`Request failed with status ${status}`, status, fallbackCode);
    }
  }
}

let accountSequence = 0;

export function createTestAccount(seed?: string): TestAccount {
  accountSequence += 1;
  const raw = seed ?? `run-${Date.now().toString(36)}-${accountSequence}`;
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, '');
  return {
    name: 'QA Automation',
    email: `qa+${safe}@example.com`,
    password: 'Minerva1QA',
  };
}

export async function captureApiError(action: () => Promise<unknown>): Promise<ApiError> {
  try {
    await action();
  } catch (error) {
    if (error instanceof ApiError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected the request to fail, but it succeeded');
}

export function retryAfterSeconds(error: ApiError): number {
  const details = error.details as { retryAfterSeconds?: unknown } | undefined;
  return typeof details?.retryAfterSeconds === 'number' ? details.retryAfterSeconds : 30;
}

export class AuthClient {
  private readonly baseUrl: string;

  constructor(
    private readonly context: APIRequestContext,
    baseUrl: string = APP_ORIGIN
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private headers(): Record<string, string> {
    return { origin: this.baseUrl, accept: 'application/json' };
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private async expect(response: APIResponse, ...statuses: number[]): Promise<void> {
    if (!statuses.includes(response.status())) {
      throw await ApiError.from(response);
    }
  }

  async register(account: TestAccount): Promise<PublicUser> {
    const response = await this.context.post(this.url('/api/auth/register'), {
      headers: this.headers(),
      data: { name: account.name, email: account.email, password: account.password },
    });
    await this.expect(response, 201);
    const body = (await response.json()) as { user: PublicUser };
    return body.user;
  }

  async registerWithRateLimitRetry(account: TestAccount, maxAttempts = 4): Promise<PublicUser> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.register(account);
      } catch (error) {
        const canRetry = error instanceof ApiError && error.status === 429 && attempt < maxAttempts;
        if (!canRetry) {
          throw error;
        }
        // Server reports the window end (can be minutes); cap the wait so the
        // test timeout still has headroom, and add jitter to desynchronize workers.
        const waitMs = Math.min(retryAfterSeconds(error as ApiError), 20) * 1000;
        const jitterMs = Math.floor(Math.random() * 500);
        await new Promise((resolve) => setTimeout(resolve, waitMs + jitterMs));
      }
    }
  }

  async login(input: LoginInput): Promise<PublicUser> {
    const response = await this.context.post(this.url('/api/auth/login'), {
      headers: this.headers(),
      data: {
        email: input.email,
        password: input.password,
        remember: input.remember ?? true,
      },
    });
    await this.expect(response, 200);
    const body = (await response.json()) as { user: PublicUser };
    return body.user;
  }

  async logout(): Promise<void> {
    const response = await this.context.post(this.url('/api/auth/logout'), {
      headers: this.headers(),
      data: {},
    });
    await this.expect(response, 200);
  }

  async me(): Promise<PublicUser> {
    const response = await this.context.get(this.url('/api/auth/me'), {
      headers: { accept: 'application/json' },
    });
    await this.expect(response, 200);
    const body = (await response.json()) as { user: PublicUser };
    return body.user;
  }

  async deleteAccount(): Promise<void> {
    const response = await this.context.delete(this.url('/api/users/me'), {
      headers: this.headers(),
    });
    await this.expect(response, 200);
  }

  async cleanupAccount(account: TestAccount): Promise<void> {
    let response = await this.context.delete(this.url('/api/users/me'), {
      headers: this.headers(),
    });
    if (response.status() === 401) {
      await this.login({ email: account.email, password: account.password });
      response = await this.context.delete(this.url('/api/users/me'), {
        headers: this.headers(),
      });
    }
    if (response.status() !== 200 && response.status() !== 404) {
      throw await ApiError.from(response);
    }
  }

  async updateProfile(patch: Record<string, unknown>): Promise<SavedProfile> {
    const response = await this.context.put(this.url('/api/profile'), {
      headers: this.headers(),
      data: patch,
    });
    await this.expect(response, 200);
    const body = (await response.json()) as { profile: SavedProfile };
    return body.profile;
  }

  async getPacks(): Promise<PricingPack[]> {
    const response = await this.context.get(this.url('/api/pricing/packs'), {
      headers: { accept: 'application/json' },
    });
    await this.expect(response, 200);
    const body = (await response.json()) as { packs: PricingPack[] };
    return body.packs;
  }

  async topUp(packId: TokenPackId): Promise<TopUpResult> {
    const response = await this.context.post(this.url('/api/billing/demo-topups'), {
      headers: this.headers(),
      data: { packId },
    });
    await this.expect(response, 200);
    return (await response.json()) as TopUpResult;
  }

  async health(): Promise<HealthStatus> {
    const response = await this.context.get(this.url('/api/health'), {
      headers: { accept: 'application/json' },
    });
    await this.expect(response, 200);
    return (await response.json()) as HealthStatus;
  }

  async storageState() {
    return this.context.storageState();
  }
}
