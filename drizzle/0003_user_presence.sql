CREATE TABLE user_presence (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    expires INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    updated INTEGER NOT NULL,
    PRIMARY KEY(user_id, client_id)
);
CREATE INDEX presence_user_expiry ON user_presence(user_id, expires);
