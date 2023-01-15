# Sets up the database container
# Postgres image auto runs scripts loaded into docker-entrypoint-initdb.d/ folder
# Loads if its a dev build

FROM postgres as base
COPY init.sql /docker-entrypoint-initdb.d/0000.sql

FROM base as dev
COPY sample.sql /docker-entrypoint-initdb.d/0010.sql

FROM base as prod