# Pre-commit hooks configuration

# Install: pip install pre-commit && pre-commit install: Ramanayudu form Safariii 
# Or use: npx pre-commit Install : ramanayudu form chrome and more woring with. vs code 
testing versions
repos:

- repo: https://github.com/pre-commit/pre-commit-hooks
  rev: v4.5.0
  hooks:
  - id: trailing-whitespace
  - id: end-of-file-fixer
  - id: check-yaml
  - id: check-json
  - id: check-added-large-files
    args: ['--maxkb=1000']
  - id: detect-private-key
  - id: detect-aws-credentials
  - id: detect-secrets
    args: ['--baseline', '.secrets.baseline']
    additional_dependencies: ['detect-secrets[gibberish]']

- repo: https://github.com/Yelp/detect-secrets
  rev: v1.4.0
  hooks:
  - id: detect-secrets
    args: ['--baseline', '.secrets.baseline']
    exclude: package-lock.json|pnpm-lock.yaml

- repo: local
  hooks:
  - id: check-env-files
    name: Check for committed .env files
    entry: bash -c 'if git diff --cached --name-only | grep -E "\.env$|\.env\."; then echo "ERROR: .env files should not be committed!"; exit 1; fi'
    language: system
    pass_filenames: false

 
