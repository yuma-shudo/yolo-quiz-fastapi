# 1. ベースイメージを指定
FROM node:20

# 2. 作業ディレクトリを指定
WORKDIR /app

# 3. 必要なファイルをコピー
COPY package.json /app

# 4. 必要なパッケージをインストール
RUN npm install

# 5. 実行するコマンドを指定
CMD ["npm", "run", "dev"]