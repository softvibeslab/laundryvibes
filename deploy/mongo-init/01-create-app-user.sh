#!/bin/sh
set -eu

# The official Mongo image runs this only while initializing an empty data
# directory. Create a least-privilege account scoped to the application DB.
mongosh --quiet \
  --username "$MONGO_INITDB_ROOT_USERNAME" \
  --password "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  "$MONGO_INITDB_DATABASE" \
  --eval 'db.createUser({user: process.env.MONGO_APP_USERNAME, pwd: process.env.MONGO_APP_PASSWORD, roles: [{role: "readWrite", db: process.env.MONGO_INITDB_DATABASE}]})'