
service qrlogin stop
rm -rfv "$1/usr/lib/qrlogin"
rm -v "$1/etc/init.d/qrlogin"
rm -v "$1/etc/logrotate.d/qrlogin"

update-rc.d -f qrlogin remove

