# Ejecución Segura

## Resolución de Rutas

La función central `resolve_authorized_path(root, candidate, operation)` en
`webforge/execution/permissions.py` es el punto único de control de acceso
a archivos. Bloquea:

- Path traversal (`..`)
- Rutas absolutas externas al workspace
- Rutas Windows externas (`C:\...`)
- Rutas UNC (`\\server\share\...`)
- Symlinks que escapen del workspace
- Acceso a archivos sensibles (`.env`, `*.pem`, `*.key`, `credentials*`, `secrets*`)
- Acceso a `versions/v0001` y documentos fuente protegidos

## Redacción de Secretos

Patrones protegidos en filenames:

```
.env
.env.*
*.pem
*.key
*.p12
*.pfx
id_rsa
id_ed25519
credentials*
secrets*
```

Se permite `.env.example`.

Redacción automática en argumentos, stdout, stderr, reportes y ledgers:

- Passwords, tokens, API keys
- Authorization headers
- Cookies, connection strings
- Private keys
- Patrones: `sk-...`, `ghp_...`, `AKIA...`

## Ejecución de Procesos

`tool.process.run` usa `subprocess.run(..., shell=False)`.

Los argumentos se reciben como lista (nunca como string).

### Allowlist de ejecutables

Permitidos: `python`, `python.exe`, `python3`, `node`, `node.exe`,
`npm`, `npm.cmd`, `npx`, `npx.cmd`, `pytest`, `pytest.exe`,
`docker`, `docker.exe`, `docker-compose`, `docker-compose.exe`

### Comandos bloqueados

`powershell`, `pwsh`, `cmd`, `bash`, `sh`, `zsh`, `curl`, `wget`,
`ssh`, `scp`, `sftp`, `rm`, `del`, `rd`, `rmdir`, `chmod`, `chown`,
`apt`, `apt-get`, `yum`, `dnf`, `brew`, `sudo`, `su`

### Operadores de shell bloqueados

`|`, `>`, `<`, `&&`, `||`, `;`, `` ` ``, `$(`

### Protecciones adicionales

- Timeout efectivo en todas las ejecuciones
- Captura de exit code
- stdout y stderr con truncamiento configurable
- Working directory autorizado (resuelto contra project_root)
- Redacción de secretos en toda la salida
- Registro en ledger (`tool-ledger.jsonl`)
