FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run -r build
RUN pnpm deploy --filter=agent-server --prod /prod/agent-server
# RUN pnpm deploy --filter=agent-frontend --prod /prod/agent-frontend

FROM base AS agent-server
COPY --from=build /prod/agent-server/.keystone /prod/agent-server/.keystone
COPY --from=build /prod/agent-server/.prisma /prod/agent-server/.prisma
COPY --from=build /prod/agent-server/migrations /prod/agent-server/migrations
COPY --from=build /prod/agent-server/node_modules /prod/agent-server/node_modules
COPY --from=build /prod/agent-server/package.json /prod/agent-server/package.json
COPY --from=build /prod/agent-server/schema.prisma /prod/agent-server/schema.prisma
WORKDIR /prod/agent-server

EXPOSE 3000
CMD [ "pnpm", "start" ]
