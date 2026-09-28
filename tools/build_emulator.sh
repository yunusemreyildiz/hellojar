#!/bin/sh
# Rebuilds public/freej2me-web.jar = upstream freej2me-web.jar + our overrides in emulator/src.
# Needs a JDK (javac/jar on PATH, or JAVA_HOME set).
set -e
cd "$(dirname "$0")/.."
BIN="${JAVA_HOME:+$JAVA_HOME/bin/}"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

"${BIN}javac" --release 8 -nowarn -cp emulator/freej2me-web.orig.jar -d "$TMP" \
    $(find emulator/src -name '*.java') 2>&1 | grep -v '^Note:' || true
cp emulator/freej2me-web.orig.jar public/freej2me-web.jar
(cd "$TMP" && "${BIN}jar" uf "$OLDPWD/public/freej2me-web.jar" .)
echo "built public/freej2me-web.jar with: $(cd "$TMP" && find . -name '*.class' | sed 's|^\./||' | tr '\n' ' ')"
