FROM ghcr.io/martinjt/ocb-config-builder:nightly as build
ENV ADDITIONAL_REPOS=github.com/martinjt/resourceattrtocontextconnector
COPY config.yaml /config.yaml
RUN ocbconfigbuilder
RUN CGO_ENABLED=0 builder --config=/ocb-config.yaml --output-path=/app

FROM cgr.dev/chainguard/static:latest
COPY --from=build /app/otelcol-custom /
COPY config.yaml /
EXPOSE 4317/tcp 4318/tcp 13133/tcp

CMD ["/otelcol-custom", "--config=/config.yaml"]