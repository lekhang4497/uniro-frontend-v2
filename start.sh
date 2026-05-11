docker stop uniro
docker rm uniro
docker build -t uniro .
docker run -d --name uniro -p 20128:20128 --env-file .env -v uniro-data:/app/data uniro