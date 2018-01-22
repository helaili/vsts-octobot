## Install homebrew

sh -c "$(curl -fsSL https://raw.githubusercontent.com/Linuxbrew/install/master/install.sh)"

## Installing Redis
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
sudo make install

### Configure redis config
sudo cp redis.conf /etc/redis.conf
set appendonly to yes in /etc/redis.conf for durability

### Optimize system for Redis
`sudo vi /etc/rc.local` and add `echo never > /sys/kernel/mm/transparent_hugepage/enabled`
`sudo vi /etc/sysctl.conf` and add `vm.overcommit_memory = 1`

### Configure startup mode
sudo mkdir /etc/redis
sudo mkdir /var/redis

sudo cp utils/redis_init_script /etc/init.d/redis_6379
sudo vi /etc/init.d/redis_6379

change header to
```
#!/bin/sh
#
# Simple Redis init.d script conceived to work on Linux systems
# as it does use of the /proc filesystem.
# chkconfig: 2345 90 60
# processname: redis-server
# config: /etc/redis.conf
# pidfile: /var/run/redis_6379.pid
```

make sure `CONF="/etc/redis.conf"``

sudo mkdir /var/redis/6379

sudo vi /etc/redis.conf

Set daemonize to yes (by default it is set to no).
Set the pidfile to /var/run/redis_6379.pid (modify the port if needed).
Change the port accordingly. In our example it is not needed as the default port is already 6379.
Set your preferred loglevel.
Set the logfile to /var/log/redis_6379.log
Set the dir to /var/redis/6379 (very important step!)

sudo chkconfig --add redis_6379

Reboot


## Install node
brew install node

## Deploy PM2
npm install pm2@latest -g

## Deploy
Back to your machine
Edit `ecosystem.config.js` accordingly. This file isn't committed to git so you can put secrets in.
pm2 deploy production setup
pm2 deploy production
pm2 deploy production exec "pm2 show vsts-octobot"
