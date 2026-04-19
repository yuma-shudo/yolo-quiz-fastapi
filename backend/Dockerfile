# 1. ベースイメージを指定
FROM python:3.11

# 2. 作業ディレクトリを指定
WORKDIR /app

# 3. 必要なファイルをコピー
COPY requirements.txt /app

# 4. 必要なパッケージをインストール
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install -r requirements.txt
RUN apt-get update && apt-get install -y libgl1

# 5. 実行するコマンドを指定
CMD ["uvicorn", "main:app", "--host", "0.0.0.0",  "--port", "8000"]