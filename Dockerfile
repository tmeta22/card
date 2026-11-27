FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs store.mjs ./
COPY docs ./docs
USER node
EXPOSE 8080
CMD ["node","--disable-warning=ExperimentalWarning","server.mjs"]
