# HackerHero — Static web app served with nginx
FROM nginx:alpine

# Remove default nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy application files
COPY index.html favicon.svg /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY docs/ /usr/share/nginx/html/docs/

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
