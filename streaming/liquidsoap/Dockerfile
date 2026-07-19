FROM savonet/liquidsoap:v2.4.5

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/lib/radio /var/log/liquidsoap /etc/liquidsoap/scripts
WORKDIR /var/lib/radio

VOLUME ["/var/lib/radio", "/var/log/liquidsoap", "/etc/liquidsoap/scripts"]

ENTRYPOINT []
CMD ["sleep", "infinity"]
