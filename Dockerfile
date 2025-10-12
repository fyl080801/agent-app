ARG BASEIMAGE=node:22-alpine
FROM ${BASEIMAGE} AS base
RUN apk update && apk upgrade \
    apk add --no-cache openssl \
    rm -rf /var/cache/apk/*
RUN npm install -g pnpm

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN pnpm install --frozen-lockfile
RUN pnpm run -r build
RUN pnpm deploy --filter=agent-server --prod /prod/agent-server

# Runtime stage
FROM base AS agent-server
COPY --from=build /prod/agent-server/.keystone /prod/agent-server/.keystone
COPY --from=build /prod/agent-server/migrations /prod/agent-server/migrations
COPY --from=build /prod/agent-server/node_modules /prod/agent-server/node_modules
COPY --from=build /prod/agent-server/.prisma /prod/agent-server/.prisma
COPY --from=build /prod/agent-server/package.json /prod/agent-server/package.json
COPY --from=build /prod/agent-server/schema.prisma /prod/agent-server/schema.prisma
WORKDIR /prod/agent-server

EXPOSE 3000
CMD [ "pnpm", "start" ]

