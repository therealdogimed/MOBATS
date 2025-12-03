#!/bin/bash

# --- CONFIG ---
APP_NAME="mobats"
APP_DIR="/var/www/MOBATS"
DEFAULT_PORT=3001
SUBDOMAIN="mobats.work.gd"
EMAIL="dvndrew@yahoo.com"  # For Let's Encrypt
APACHE_CONF="/etc/apache2/sites-available/${SUBDOMAIN}.conf"

# --- STOP CURRENT APP ---
echo "Stopping any running $APP_NAME..."
pm2 stop $APP_NAME || true
pm2 delete $APP_NAME || true

# --- FIND FREE PORT ---
PORT=$DEFAULT_PORT
while lsof -i:$PORT >/dev/null 2>&1; do
  PORT=$((PORT+1))
done
echo "Using port $PORT"

# --- BUILD ---
cd $APP_DIR || exit
echo "Installing dependencies..."
npm install
echo "Building app..."
npm run build

# --- START APP WITH PM2 ---
echo "Starting $APP_NAME on port $PORT..."
pm2 start "npm -- start" --name $APP_NAME --env PORT=$PORT

# --- APACHE CONFIG ---
if [ ! -f $APACHE_CONF ]; then
cat <<EOF | sudo tee $APACHE_CONF
<VirtualHost *:80>
    ServerName $SUBDOMAIN

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:$PORT/
    ProxyPassReverse / http://127.0.0.1:$PORT/

    ErrorLog \${APACHE_LOG_DIR}/${APP_NAME}-error.log
    CustomLog \${APACHE_LOG_DIR}/${APP_NAME}-access.log combined
</VirtualHost>
EOF

    sudo a2ensite $SUBDOMAIN
    sudo a2enmod proxy proxy_http rewrite ssl headers
    sudo systemctl reload apache2
fi

# --- LET'S ENCRYPT SSL ---
echo "Requesting SSL certificate via Certbot..."
sudo certbot --apache -d $SUBDOMAIN --non-interactive --agree-tos -m $EMAIL

echo "Deployment complete!"
echo "Visit: https://$SUBDOMAIN"
