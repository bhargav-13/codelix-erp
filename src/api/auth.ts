import { authApi as generatedAuthApi, promisify } from '../lib/apiConfig';
import type { SignInRequest, AuthResponse, RefreshTokenRequest } from '../types';

export const authApi = {
  signIn: (data: SignInRequest): Promise<AuthResponse> =>
    promisify<AuthResponse>(cb => generatedAuthApi.signIn(data, cb)),

  refreshToken: (data: RefreshTokenRequest): Promise<AuthResponse> =>
    promisify<AuthResponse>(cb => generatedAuthApi.refreshToken(data, cb)),
};
