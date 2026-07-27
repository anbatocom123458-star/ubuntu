FROM tsbread/ttyd:latest

# Cài đặt thêm bash và các công cụ cần thiết
RUN apk add --no-run-cache bash curl git htop

# Mở port cho Railway
EXPOSE 7681

# Chạy ttyd với bash shell
CMD ["ttyd", "-W", "-p", "7681", "bash"]
