"""
Vault backend adapters — lazy-loaded by `secret_loader.py` when
`SECRET_BACKEND` is set to a non-env value.

Each adapter MUST:
  • read its required config from env (endpoints, paths, tokens)
  • be stateless across calls (or cache internally if needed)
  • raise on misconfiguration so the caller's error log is useful
  • return `None` when a key is simply absent (not an error)

Adding a new adapter
--------------------
1. Implement a subclass of `SecretBackend` with `name = "myvendor"` and a
   `fetch(self, key)` method.
2. Add a branch in `build_backend(name)` below.
3. Document the required env vars in /app/backend/.env.example.

Currently the adapters here are LIGHTWEIGHT STUBS — they raise ImportError on
construction if the corresponding SDK is not installed, which is the
intentional "explicit opt-in" pattern. Install the SDK ONLY when you actually
pick a vault.
"""
from __future__ import annotations

import os
from typing import Optional

from secret_loader import SecretBackend


# ─── Doppler ────────────────────────────────────────────────────────────────
# Doppler injects secrets as env vars via `doppler run -- python server.py`.
# So the "doppler" backend is functionally identical to env-only at runtime;
# we keep the distinction for audit-log clarity and so future versions can
# call the Doppler CLI/API directly.
class DopplerBackend(SecretBackend):
    name = "doppler"

    def fetch(self, key: str) -> Optional[str]:
        return os.environ.get(key)


# ─── AWS Secrets Manager ────────────────────────────────────────────────────
class AWSSecretsManagerBackend(SecretBackend):
    name = "aws"

    def __init__(self):
        try:
            import boto3  # type: ignore
        except ImportError as e:
            raise ImportError(
                "boto3 is required for SECRET_BACKEND=aws. "
                "Install with: pip install boto3"
            ) from e
        self._boto3 = boto3
        region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION")
        if not region:
            raise RuntimeError("AWS_REGION env var is required for SECRET_BACKEND=aws.")
        # The optional secret-name prefix lets you namespace per-environment:
        #   AWS_SECRETS_PREFIX=lusorae/prod/ -> fetches "lusorae/prod/JWT_SECRET"
        self.prefix = os.environ.get("AWS_SECRETS_PREFIX", "")
        self.client = self._boto3.client("secretsmanager", region_name=region)

    def fetch(self, key: str) -> Optional[str]:
        try:
            resp = self.client.get_secret_value(SecretId=f"{self.prefix}{key}")
        except self._boto3.client("secretsmanager").exceptions.ResourceNotFoundException:
            return None
        except Exception:
            raise
        return resp.get("SecretString")


# ─── GCP Secret Manager ─────────────────────────────────────────────────────
class GCPSecretManagerBackend(SecretBackend):
    name = "gcp"

    def __init__(self):
        try:
            from google.cloud import secretmanager  # type: ignore
        except ImportError as e:
            raise ImportError(
                "google-cloud-secret-manager is required for SECRET_BACKEND=gcp. "
                "Install with: pip install google-cloud-secret-manager"
            ) from e
        self.project = os.environ.get("GCP_PROJECT") or os.environ.get("GOOGLE_CLOUD_PROJECT")
        if not self.project:
            raise RuntimeError("GCP_PROJECT env var is required for SECRET_BACKEND=gcp.")
        self.version = os.environ.get("GCP_SECRET_VERSION", "latest")
        self.client = secretmanager.SecretManagerServiceClient()

    def fetch(self, key: str) -> Optional[str]:
        name = f"projects/{self.project}/secrets/{key}/versions/{self.version}"
        from google.api_core.exceptions import NotFound  # type: ignore
        try:
            response = self.client.access_secret_version(name=name)
        except NotFound:
            return None
        return response.payload.data.decode("utf-8")


# ─── HashiCorp Vault ────────────────────────────────────────────────────────
class HashiCorpVaultBackend(SecretBackend):
    name = "vault"

    def __init__(self):
        try:
            import hvac  # type: ignore
        except ImportError as e:
            raise ImportError(
                "hvac is required for SECRET_BACKEND=vault. "
                "Install with: pip install hvac"
            ) from e
        addr = os.environ.get("VAULT_ADDR")
        token = os.environ.get("VAULT_TOKEN")
        if not addr or not token:
            raise RuntimeError("VAULT_ADDR and VAULT_TOKEN env vars are required for SECRET_BACKEND=vault.")
        self.mount = os.environ.get("VAULT_MOUNT", "secret")
        self.path_prefix = os.environ.get("VAULT_PATH", "lusorae")
        self.client = hvac.Client(url=addr, token=token)

    def fetch(self, key: str) -> Optional[str]:
        try:
            resp = self.client.secrets.kv.v2.read_secret_version(
                path=f"{self.path_prefix}/{key}",
                mount_point=self.mount,
            )
        except Exception:
            return None
        data = resp.get("data", {}).get("data", {})
        return data.get("value")


# ─── Azure Key Vault ────────────────────────────────────────────────────────
class AzureKeyVaultBackend(SecretBackend):
    name = "azure"

    def __init__(self):
        try:
            from azure.identity import DefaultAzureCredential  # type: ignore
            from azure.keyvault.secrets import SecretClient  # type: ignore
        except ImportError as e:
            raise ImportError(
                "azure-identity + azure-keyvault-secrets are required for SECRET_BACKEND=azure. "
                "Install with: pip install azure-identity azure-keyvault-secrets"
            ) from e
        vault_url = os.environ.get("AZURE_KEY_VAULT_URL")
        if not vault_url:
            raise RuntimeError("AZURE_KEY_VAULT_URL env var is required for SECRET_BACKEND=azure.")
        self.client = SecretClient(vault_url=vault_url, credential=DefaultAzureCredential())

    def fetch(self, key: str) -> Optional[str]:
        from azure.core.exceptions import ResourceNotFoundError  # type: ignore
        # Azure Key Vault secret names must match `^[a-zA-Z0-9-]+$`; underscores
        # in `JWT_SECRET` etc. would fail. Translate at the boundary.
        safe_key = key.replace("_", "-")
        try:
            s = self.client.get_secret(safe_key)
        except ResourceNotFoundError:
            return None
        return s.value


def build_backend(name: str) -> SecretBackend:
    name = (name or "").strip().lower()
    if name in ("doppler",):
        return DopplerBackend()
    if name in ("aws", "aws-sm", "secretsmanager"):
        return AWSSecretsManagerBackend()
    if name in ("gcp", "google", "google-sm"):
        return GCPSecretManagerBackend()
    if name in ("vault", "hashicorp", "hcp"):
        return HashiCorpVaultBackend()
    if name in ("azure", "azure-kv", "keyvault"):
        return AzureKeyVaultBackend()
    raise RuntimeError(f"Unknown SECRET_BACKEND '{name}'. Supported: doppler|aws|gcp|vault|azure|env.")
