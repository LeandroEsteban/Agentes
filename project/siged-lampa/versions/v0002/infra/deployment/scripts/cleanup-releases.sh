#!/bin/bash
set -Eeuo pipefail

echo "=== [7/7] cleanup-releases ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

RELEASES_DIR="/opt/siged-lampa/releases"
KEEP=${CLEANUP_KEEP:-3}

echo "Keeping last $KEEP releases, cleaning up older ones..."

# List releases sorted by name (which is timestamp-based), keep newest KEEP
cd "$RELEASES_DIR"
RELEASES=($(ls -1d */ 2>/dev/null | sed 's/\///' | sort))

if [ ${#RELEASES[@]} -le $KEEP ]; then
    echo "Only ${#RELEASES[@]} releases exist, nothing to clean up."
    exit 0
fi

TO_DELETE=("${RELEASES[@]:0:${#RELEASES[@]}-$KEEP}")
for release in "${TO_DELETE[@]}"; do
    echo "Removing old release: $release"
    rm -rf "$RELEASES_DIR/$release"
done

echo "CLEANUP_COMPLETE"
