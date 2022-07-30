echo "$(gawk '{sub(/"key": "[A-Za-z0-9\/+]+"/, sprintf("\"key\": \"{{%s}}\"", "GOOGLE_DEVELOPER_KEY"))}1' manifest.json
)" > manifest.json
echo "$(gawk '{sub(/"client_id": "[A-Za-z0-9\-.]+"/, sprintf("\"client_id\": \"{{%s}}\"", "OAUTH_CLIENT_ID"))}1' manifest.json
)" > manifest.json
