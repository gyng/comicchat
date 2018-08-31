FROM node:8-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

EXPOSE 8080 8084

COPY ./ ./

ARG WS_URL=ws://localhost:8084
RUN sed -i "s|ws://localhost:8084|${WS_URL}|" client/js/client.js

ENTRYPOINT ["yarn"]
CMD ["client"]
