FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S laundry && adduser -S -G laundry laundry
COPY --from=deps --chown=laundry:laundry /app/node_modules ./node_modules
COPY --chown=laundry:laundry . .
USER laundry
EXPOSE 3000
CMD ["node", "server.js"]
