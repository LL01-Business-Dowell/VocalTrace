# Specify the base image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"]

# ---------- Build stage ----------
# FROM node:20-alpine AS build

# WORKDIR /app

# COPY package*.json ./
# RUN npm install

# COPY . .
# RUN npm run build

# # ---------- Runtime stage ----------
# FROM nginx:alpine

# # Remove default nginx config
# RUN rm /etc/nginx/conf.d/default.conf

# # Copy our nginx config (optional – see below)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# # Copy built assets
# COPY --from=build /app/dist /usr/share/nginx/html

# EXPOSE 80

# CMD ["nginx", "-g", "daemon off;"]
