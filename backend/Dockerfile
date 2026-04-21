FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Install ts-node globally for direct TypeScript execution
RUN npm install -g ts-node typescript

EXPOSE 4000

CMD ["npx", "ts-node", "--require", "dotenv/config", "src/index.ts"]
