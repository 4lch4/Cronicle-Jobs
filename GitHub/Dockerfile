FROM oven/bun as build-runner

# Set work directory.
WORKDIR /app

# Copy package.json, bun.lockb, and tsconfig.json.
COPY package.json bun.lockb tsconfig.json /app/

# Install all dependencies.
RUN bun install

# Move source files.
COPY src ./src
COPY tsconfig.json .

# Build project.
RUN bun build ./src/index.ts --target=bun --outfile=index.js

# Production runner.
FROM oven/bun as prod-runner

# Set work directory.
WORKDIR /app

# Copy package.json, and bun.lockb, from build-runner.
COPY --from=build-runner /app/package.json /app/bun.lockb /app/

# Install production dependencies.
RUN bun install -p

# Move resulting build file from build-runner.
COPY --from=build-runner /app/index.js /app/index.js

# Start job.
CMD [ "bun", "index.js" ]
