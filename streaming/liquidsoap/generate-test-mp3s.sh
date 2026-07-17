#!/bin/bash
# =====================================================
# Genera 3 MP3s de prueba (tonos con distinta frecuencia)
# y los deja en /var/lib/radio/test/mp3/
# =====================================================
set -e

DEST="${1:-/var/lib/radio/test/mp3}"
mkdir -p "${DEST}"

DURATION=30
SAMPLE_RATE=44100

# Genera 3 tonos: 440Hz (A4), 523Hz (C5), 659Hz (E5) - un acorde mayor
echo "Generando MP3s de prueba en ${DEST}..."

for i in 1 2 3; do
    case $i in
        1) FREQ=440 ;;
        2) FREQ=523 ;;
        3) FREQ=659 ;;
    esac
    ffmpeg -y -f lavfi -i "sine=frequency=${FREQ}:duration=${DURATION}:sample_rate=${SAMPLE_RATE}" \
        -ac 2 -ab 128k \
        "${DEST}/test-tone-${i}-${FREQ}hz.mp3" \
        > /dev/null 2>&1
    echo "  ✓ test-tone-${i}-${FREQ}hz.mp3 ($(du -h ${DEST}/test-tone-${i}-${FREQ}hz.mp3 | cut -f1))"
done

ls -la "${DEST}"
echo "OK"
