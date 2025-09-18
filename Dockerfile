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
COPY --from=build /prod/agent-server /prod/agent-server
# COPY --from=build /prod/agent-server/.keystone /prod/agent-server/.keystone
# COPY --from=build /prod/agent-server/package.json /prod/agent-server/package.json
# COPY --from=build /prod/agent-server/pnpm-lock.yaml /prod/agent-server/pnpm-lock.yaml
# COPY --from=build /prod/agent-server/schema.graphql /prod/agent-server/schema.graphql
# COPY --from=build /prod/agent-server/schema.prisma /prod/agent-server/schema.prisma
# COPY --from=build /prod/agent-server/migrations /prod/agent-server/migrations
WORKDIR /prod/agent-server
RUN pnpm install --frozen-lockfile --prod

EXPOSE 3000
CMD [ "pnpm run migrate && pnpm start" ]
