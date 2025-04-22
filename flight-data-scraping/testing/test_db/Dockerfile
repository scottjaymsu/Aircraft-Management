FROM mysql:8.0

ENV MYSQL_DATABASE=test
ENV MYSQL_USER=user
ENV MYSQL_PASSWORD=password
ENV MYSQL_ROOT_PASSWORD=password

COPY test.sql /docker-entrypoint-initdb.d/

# Force MySQL to use mysql_native_password
CMD ["mysqld", "--default-authentication-plugin=mysql_native_password"]

