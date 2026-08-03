FROM savonet/liquidsoap:v2.4.5

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        tini \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario no-root para ejecutar los scripts de liquidsoap (si no existe).
# La imagen base puede ya traer el grupo/usuario 'liquidsoap'.
RUN (getent group liquidsoap >/dev/null 2>&1 || groupadd --system --gid 1001 liquidsoap) && \
    (id -u liquidsoap >/dev/null 2>&1 || useradd --system --uid 1001 --gid liquidsoap liquidsoap)

RUN mkdir -p /var/lib/radio /var/log/liquidsoap /etc/liquidsoap/scripts \
    && chown -R liquidsoap:liquidsoap /var/lib/radio /var/log/liquidsoap /etc/liquidsoap/scripts

WORKDIR /var/lib/radio

# Token usado por los callbacks de harbor (se lee desde env, no de cmdline).
# Debe coincidir con HARBOR_CALLBACK_SECRET del agente.
ENV HARBOR_CALLBACK_TOKEN=CHANGE_ME_IN_PRODUCTION

VOLUME ["/var/lib/radio", "/var/log/liquidsoap", "/etc/liquidsoap/scripts"]

USER liquidsoap

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sleep", "infinity"]
