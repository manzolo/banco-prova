#!/bin/bash
# Nuova versione: scrive la versione in package.json (e nel lock), verifica, fa il commit e crea il tag annotato
# v<versione>. Il server la espone su /api/health (campo versione): make deploy controlla che l'indirizzo pubblico la serva.
#   scripts/bump.sh [patch|minor|major]      (default patch: 0.1.0 → 0.1.1)
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
PARTE=${1:-patch}
[[ $PARTE =~ ^(patch|minor|major)$ ]] || { echo "uso: $0 [patch|minor|major]"; exit 2; }
[[ $(git branch --show-current) == main ]] || { echo "✗ non sono su main"; exit 1; }
[[ -z $(git status --porcelain) ]] || { echo "✗ ci sono modifiche non committate: prima il commit"; git status --short; exit 1; }

ATTUALE=$(python3 -c "import json; print(json.load(open('package.json'))['version'])")
[[ $ATTUALE =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "✗ versione non leggibile in package.json"; exit 1; }
IFS=. read -r MA MI PA <<<"$ATTUALE"
case $PARTE in
    major) NUOVA="$((MA + 1)).0.0" ;;
    minor) NUOVA="$MA.$((MI + 1)).0" ;;
    patch) NUOVA="$MA.$MI.$((PA + 1))" ;;
esac
git rev-parse -q --verify "refs/tags/v$NUOVA" >/dev/null && { echo "✗ il tag v$NUOVA esiste già"; exit 1; }

python3 - "$NUOVA" <<'PY'
import json, sys
v = sys.argv[1]
d = json.load(open('package.json')); d['version'] = v
open('package.json', 'w').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
d = json.load(open('package-lock.json')); d['version'] = v; d['packages']['']['version'] = v
open('package-lock.json', 'w').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
PY
if ! make -s verify; then
    git checkout -- package.json package-lock.json
    echo "✗ verifiche fallite: versione rimessa a $ATTUALE"; exit 1
fi
git commit -q -am "Versione $NUOVA"
git tag -a "v$NUOVA" -m "Banco di prova $NUOVA"
echo "✓ $ATTUALE → $NUOVA (commit e tag v$NUOVA); per pubblicarla: make deploy"
