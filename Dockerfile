FROM node:8-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

EXPOSE 8080 8084

COPY ./ ./

ENTRYPOINT ["yarn"]
CMD ["client"]
