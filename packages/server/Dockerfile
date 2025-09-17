ARG BASEIMAGE=node:22-alpine

FROM ${BASEIMAGE} as builder
ENV ALARM_CHANNAL_CONFIG=1,2
COPY . /build
WORKDIR /build
RUN sh ./scripts/build.sh

FROM ${BASEIMAGE}
WORKDIR /build
COPY --from=builder /build/output .

EXPOSE 3000

CMD npm run start
