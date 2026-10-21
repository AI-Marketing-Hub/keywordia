FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY src ./src
COPY public ./public
COPY data ./data
USER node
ENV HOST=0.0.0.0 PORT=4317 NODE_ENV=production
EXPOSE 4317
CMD ["node", "src/server.js"]
