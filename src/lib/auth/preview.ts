/**
 * Cliente OAuth de desenvolvimento (somente servidor).
 * Em produção, AUTH_ISSUER / AUTH_CLIENT_ID / AUTH_CLIENT_SECRET vêm do ambiente.
 */
export const PREVIEW_CLIENT_ID = "preview";
export const PREVIEW_CLIENT_SECRET = "";
export const AUTH_ISSUER_DEFAULT = "";
export const PREVIEW_ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"] as const;
