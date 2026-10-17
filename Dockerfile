FROM nginxinc/nginx-unprivileged:stable-alpine

COPY odometer.html /usr/share/nginx/html/index.html
COPY odometer.html /usr/share/nginx/html/odometer.html

EXPOSE 8080
