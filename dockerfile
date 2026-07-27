FROM tschuy/ttyd:latest

# Cài đặt một số công cụ cơ bản
RUN apt-get update && apt-get install -y curl git htop

# Mở port cho Railway
EXPOSE 7681

# Chạy ttyd với bash shell (có thể thêm -W để cho phép gõ)
CMD ["ttyd", "-W", "-p", "7681", "bash"]
