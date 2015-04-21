#!/bin/sh

BASEDIR=`dirname $0`

mkdir -p "$1/usr/lib/qrlogin/bin"
mkdir -p "$1/usr/lib/qrlogin/www"
mkdir -p "$1/usr/lib/qrlogin/log"
mkdir -p "$1/usr/lib/qrlogin/conf"

cp -vr "$BASEDIR/bin" "$1/usr/lib/qrlogin"
cp -vr "$BASEDIR/conf" "$1/usr/lib/qrlogin"
cp -vr "$BASEDIR/www" "$1/usr/lib/qrlogin"

mkdir -p "$1/etc/init.d"

INITSCRIPT="$1/etc/init.d/qrlogin"

echo "#!/bin/sh" > $INITSCRIPT
echo "" >> $INITSCRIPT
echo "/usr/lib/qrlogin/bin/qrpass /run/qrlogin.pid \$1" >> $INITSCRIPT

chmod +x $INITSCRIPT

mkdir -p "$1/etc/logrotate.d"

LOGROTATE="$1/etc/logrotate.d/qrlogin"

echo "/usr/lib/qrlogin/log/logfile {" > $LOGROTATE
echo "	daily" >> $LOGROTATE
echo "	rotate 7" >> $LOGROTATE
echo "	maxage 7" >> $LOGROTATE
echo "	dateext" >> $LOGROTATE
echo "	compress" >> $LOGROTATE
echo "	delaycompress" >> $LOGROTATE
echo "	notifempty" >> $LOGROTATE
echo "	missingok" >> $LOGROTATE
echo "	nocreate" >> $LOGROTATE
echo "	postrotate" >> $LOGROTATE
echo "		service qrlogin logrotate" >> $LOGROTATE
echo "	endscript" >> $LOGROTATE
echo "}" >> $LOGROTATE

update-rc.d qrlogin defaults

USERGROUP=`grep -E "^setusergroup=.*$" "$1/usr/lib/qrlogin/conf/qrpass.conf" | cut -d= -f 2`

if [ "$USERGROUP" != "" ]; then

    USERNAME=`echo $USERGROUP | cut -d: -f 1`
    GROUPNAME=`echo $USERGROUP | cut -d: -f 2`

    groupadd $GROUPNAME
    useradd -NM $USERNAME

    chown $USERGROUP "$1/usr/lib/qrlogin/log"
fi

service qrlogin start