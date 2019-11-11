#!/bin/sh

docker login -u error418 -p $GITHUB_PKG_TOKEN docker.pkg.github.com && \
docker build . --file Dockerfile --build-arg GITHUB_PKG_TOKEN=$GITHUB_PKG_TOKEN --tag docker.pkg.github.com/swingletree-oss/plugin-sonarqube/plugin-sonarqube:$1 && \
docker push docker.pkg.github.com/swingletree-oss/plugin-sonarqube/plugin-sonarqube:$1
