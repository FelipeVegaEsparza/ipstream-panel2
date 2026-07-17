#!/bin/bash
# Imprime el PID del proceso liquidsoap del mount pasado como $1.
# Vacío si no se encuentra.
MOUNT="$1"
for p in /proc/[0-9]*; do
  if [ -r "$p/cmdline" ] 2>/dev/null; then
    if tr '\0' ' ' < "$p/cmdline" 2>/dev/null | grep -q "liquidsoap /etc/liquidsoap/scripts/${MOUNT}.liq"; then
      basename "$p"
      exit 0
    fi
  fi
done
exit 0
