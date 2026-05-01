FROM node:22-alpine as build

WORKDIR /app

# Install dependencies first (caching)
COPY package*.json ./
RUN npm install

# Build the Angular application
COPY . .
RUN npm run build -- --configuration=production

# Serve using Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=build /app/dist/ids-dashboard /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
