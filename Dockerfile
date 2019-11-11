# build swingletree
FROM node:13-alpine as build

ARG NPM_REGISTRY=https://registry.npmjs.org/
ARG GITHUB_PKG_TOKEN=

ENV GITHUB_TOKEN=$GITHUB_PKG_TOKEN

COPY . /usr/src/swingletree
WORKDIR /usr/src/swingletree

#RUN npm set registry "${NPM_REGISTRY}"
RUN npm ci
RUN npm run build
RUN npm prune --production

# swingletree container image
FROM node:13-alpine

ENV NODE_ENV "production"

RUN mkdir -p /opt/plugin-sonarqube
WORKDIR /opt/plugin-sonarqube

# add build artifacts from builder image
COPY --from=build /usr/src/swingletree/bin .
COPY --from=build /usr/src/swingletree/node_modules ./node_modules

# add misc files like views or configurations
COPY templates ./templates
COPY swingletree.conf.yaml .

ENTRYPOINT [ "node", "main.js" ]
