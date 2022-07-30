source .env
# echo GOOGLE_DEVELOPER_KEY=$GOOGLE_DEVELOPER_KEY
# echo OAUTH_CLIENT_ID=$OAUTH_CLIENT_ID
echo "$(gawk -v dev_key="$GOOGLE_DEVELOPER_KEY" '{sub(/{{GOOGLE_DEVELOPER_KEY}}/, dev_key)}1' manifest.json)" > manifest.json
echo "$(gawk -v oauth_client_id="$OAUTH_CLIENT_ID" '{sub(/{{OAUTH_CLIENT_ID}}/, oauth_client_id)}1' manifest.json)" > manifest.json